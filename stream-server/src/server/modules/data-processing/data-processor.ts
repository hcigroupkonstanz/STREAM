import * as _ from 'lodash';
import { Manager, SqliteDatabaseProxy } from '../database';
import { DataProvider, DataDimension } from '../data-provider';
import { Service } from '../core';
import { Plot, Link } from '../plots';
import { Filter } from './filter';
import { Point, PointUtils } from './point-utils';
import { filter, bufferTime } from 'rxjs/operators';
import { Observable, Subject, merge, BehaviorSubject } from 'rxjs';

const SOURCE_TABLE = 'source';
const ID_COLUMN = '[id]';
const VIEW_PREFIX = 'view_plot_';

export class DataProcessor extends Service {
    public serviceName = 'PlotData';
    public groupName = 'data';

    private plotUpdateStream = new Subject<Plot>();
    private slowPlotUpdateStream = new Subject<Plot>();
    private transactionId = 0;

    constructor(
        private dataProvider$: BehaviorSubject<DataProvider>,
        private db: SqliteDatabaseProxy,
        private plots: Manager<Plot>,
        private links: Manager<Link>,
        private filters: Manager<Filter>,
    ) {
        super();
    }

    public async init() {
        this.dataProvider$.pipe(
            filter(p => !!p)
        ).subscribe(async dataProvider => {
            await dataProvider.initialized$.toPromise();
            await this.db.backupAndReset();
            this.loadDimensions(dataProvider.dimensions);
            for (const plot of this.orderPlots(this.plots.loadedEntries)) {
                await this.updatePlotData(plot);
            }
        });

        merge(
            this.plotUpdateStream.pipe(bufferTime(500), filter(ps => ps.length > 0)),
            this.slowPlotUpdateStream.pipe(bufferTime(3000), filter(ps => ps.length > 0))
        )
            .subscribe(async ps => {
                const currentTransactionId = ++this.transactionId;
                for (const plot of _.uniq(ps)) {
                    if (currentTransactionId === this.transactionId) {
                        await this.updatePlotData(plot);
                        this.triggerCascadingChanges(plot, currentTransactionId);
                    } else {
                        this.logWarning('Transaction ID has changed, rescheduling data updates...');
                        this.slowPlotUpdateStream.next(plot);
                    }
                }
            });

        // initialize filters
        this.filters.modelCreated$.subscribe(async f => {
            const plot = this.plots.findLoadedEntry({ id: f.origin });
            if (plot) {
                this.plotUpdateStream.next(plot);
            }
        });

        this.filters.modelChanges$
            .pipe(filter(e =>
                _.includes(e.changes, 'path')
                || _.includes(e.changes, 'axisY')
                || _.includes(e.changes, 'axisX')))
            .subscribe(async ev => {
                const plot = this.plots.findLoadedEntry({ id: ev.model.origin });
                this.plotUpdateStream.next(plot);
            });

        this.filters.modelDeleted$.subscribe(async f => {
            const plot = this.plots.findLoadedEntry({ id: f.origin });
            if (plot) {
                this.plotUpdateStream.next(plot);
            }
        });


        // manage views
        for (const plot of this.orderPlots(this.plots.loadedEntries)) {
            await this.updatePlotData(plot);
        }

        this.plots.modelCreated$.subscribe(plot => {
            this.updatePlotData(plot);
        });

        this.plots.modelDeleted$.subscribe(plot => {
            this.removePlot(plot);
            this.triggerCascadingChanges(plot, ++this.transactionId);
        });

        this.links.modelChanges$
            .pipe(filter(ev => _.intersection(ev.changes, ['useSort', 'upstream', 'downstream']).length > 0))
            .subscribe(async ev => {
                const plot = this.plots.findLoadedEntry({ id: ev.model.downstream });

                if (plot) {
                    for (const upId of this.getUpstreamIds(plot)) {
                        const upPlot = this.plots.findLoadedEntry({ id: upId });
                        if (upPlot) {
                            this.updatePlotData(upPlot);
                        } else {
                            this.logError(`Unknown upstream plot ${upPlot}`);
                        }
                    }
                    this.plotUpdateStream.next(plot);
                }
            });

        this.links.modelDeleted$
            .subscribe(async m => {
                if (m.downstream >= 0) {
                    const plot = this.plots.findLoadedEntry({ id: m.downstream });
                    if (plot) {
                        this.plotUpdateStream.next(plot);
                    }
                }
            });

        this.plots.modelChanges$
            .pipe(filter(c => _.intersection(c.changes, ['dimX', 'dimY', 'aggregationLevel', 'useFilter', 'useSort']).length > 0))
            .subscribe(async c => {
                for (const upId of this.getUpstreamIds(c.model)) {
                    const upPlot = this.plots.findLoadedEntry({ id: upId });
                    if (upPlot) {
                        this.updatePlotData(upPlot);
                    } else {
                        this.logError(`Unknown upstream plot ${upPlot}`);
                    }
                }
                this.plotUpdateStream.next(c.model);
            });
    }

    private toSqlColumn(str: string): string {
        return str.replace(/[^A-Za-z]/g, '_').toLowerCase();
    }

    private getSqlType(data: any[]): string {
        for (const d of data) {
            if (d !== null && d !== undefined) {
                if (typeof d === 'number') {
                    return 'FLOAT';
                }
                if (typeof d === 'string') {
                    const maxLength = Math.ceil(_.maxBy(data, (x: string) => x.length));
                    if (maxLength <= 255) {
                        return 'VARCHAR(' + maxLength + ')';
                    } else {
                        return 'TEXT';
                    }
                }
            }
        }

        this.logError(`Unable to determine type of sql column (typeof ${typeof data[0]})!`, false);
        return 'TEXT';
    }

    private loadDimensions(dims: ReadonlyArray<DataDimension>): void {

        this.db.initTable(SOURCE_TABLE, [`${ID_COLUMN} INT PRIMARY KEY`]);

        const valueNames = ['id'];
        const valueBindings = ['@id'];
        for (const dim of dims) {
            const column = this.toSqlColumn(dim.column);
            const type = this.getSqlType(dim.data);
            this.db.run(`ALTER TABLE ${SOURCE_TABLE} ADD [${column}] ${type}`, {});
            valueNames.push(`[${column}]`);
            valueBindings.push(`@${this.toSqlColumn(dim.column)}`);
        }

        for (let i = 0; i < this.dataProvider$.value.rawData.length; i++) {
            const val = { id: i };
            for (const dim of dims) {
                val[this.toSqlColumn(dim.column)] = dim.data[i];
            }
            this.db.insert(`INSERT INTO ${SOURCE_TABLE} (${valueNames.join(', ')}) VALUES (${valueBindings.join(', ')})`, val);
        }
    }



    private async updatePlotData(plot: Plot) {
        const allData: [number, number, number, number][] = [];

        if (!this.dataProvider$.value) {
            return;
        }

        const dimensions = this.dataProvider$.value.dimensions;
        const queryX = plot.dimX ? `${SOURCE_TABLE}.${this.toSqlColumn(plot.dimX)}` : 'null';
        const queryY = plot.dimY ? `${SOURCE_TABLE}.${this.toSqlColumn(plot.dimY)}` : 'null';
        const dimX = _.find(dimensions, dim => dim.column === plot.dimX);
        const dimY = _.find(dimensions, dim => dim.column === plot.dimY);

        let query: Observable<any>;

        const fromSource = this.getSource(plot);
        // const join = `LEFT JOIN ${VIEW_PREFIX + plot.id} AS curr ON ${SOURCE_TABLE}.${ID_COLUMN} = curr.${ID_COLUMN}`;

        // if (plot.aggregationLevel === 0) { // 'normal' data query
            const select = `SELECT DISTINCT ${SOURCE_TABLE}.${ID_COLUMN}, ${queryX} AS 'x', ${queryY} AS 'y'`;
            const orderBy = `ORDER BY ${SOURCE_TABLE}.${ID_COLUMN}`;
            query = this.db.query(`${select} ${fromSource} ${orderBy}`, {});

            query.subscribe(datum => {
                const x = dimX ? dimX.normalize(dimX.transform(datum.x)) : null;
                const y = dimY ? dimY.normalize(dimY.transform(datum.y)) : null;
                allData.push([datum.id, x, y, 0]);
            });


        // } else if (dimX.maxAggregation >= plot.aggregationLevel && dimY.maxAggregation >= plot.aggregationLevel) { // aggregated query

        //     const aggregation = _.find(this.dataProvider.aggregations, a => a.level === plot.aggregationLevel);

        //     const selectX = plot.dimX ? aggregation.aggregator.replace('%s', queryX) : null;
        //     const selectY = plot.dimY ? aggregation.aggregator.replace('%s', queryY) : null;

        //     // TODO: isFiltered may be incorrect here?
        //     const select = `SELECT DISTINCT
        //         '[' || group_concat(${SOURCE_TABLE}.${ID_COLUMN}) || ']' as 'concat_id',
        //         ${selectX} as 'x',
        //         ${selectY} as 'y',
        //         '[' || group_concat(curr.${ID_COLUMN}) || ']' as 'isFiltered'`;


        //     let groupBy = aggregation.groupBy;
        //     const replaceRegex = /<(.*?)>/g;
        //     let match = replaceRegex.exec(groupBy);
        //     while (match !== null) {
        //         groupBy = groupBy.replace(match[0], `${SOURCE_TABLE}.${this.toSqlColumn(match[1])}`);
        //         match = replaceRegex.exec(groupBy);
        //     }

        //     this.logDebug(`${select} ${fromSource} ${join} ${groupBy}`);
        //     query = this.db.query(`${select} ${fromSource} ${join} ${groupBy}`, {});
        //     let idCounter = 0;

        //     query.subscribe(datum => {
        //         const x = dimX ? dimX.normalize(dimX.transform(datum.x)) : null;
        //         const y = dimY ? dimY.normalize(dimY.transform(datum.y)) : null;
        //         allData.push([idCounter, x, y, datum.isFiltered === null ? 1 : 0]);
        //         idCounter++;
        //     });


        // } else { // mixed query

        //     // TODO
        //     const select = `SELECT DISTINCT ${SOURCE_TABLE}.${ID_COLUMN}, ${queryX} AS 'x', ${queryY} AS 'y', curr.${ID_COLUMN} AS 'isFiltered'`;
        //     const orderBy = `ORDER BY ${SOURCE_TABLE}.${ID_COLUMN}`;
        //     query = this.db.query(`${select} ${fromSource} ${join} ${orderBy}`, {});
        //     query.subscribe(datum => {
        //         const x = dimX ? dimX.normalize(dimX.transform(datum.x)) : null;
        //         const y = dimY ? dimY.normalize(dimY.transform(datum.y)) : null;
        //         allData.push([datum.id, x, y, datum.isFiltered === null ? 1 : 0]);
        //     });
        // }

        await query.toPromise();

        if (plot.useSort) {
            let yValues = [];
            for (const data of allData) {
                yValues.push([data[0], data[2]]);
            }

            yValues = _.sortBy(yValues, v => v[1]);
            for (let i = 0; i < allData.length; i++) {
                yValues[i][1] = i / (allData.length - 1);
            }
            yValues = _.sortBy(yValues, v => v[0]);

            for (let i = 0; i < allData.length; i++) {
                allData[i][1] = yValues[i][1];
            }
        }




        // initPlotView
        let tableQuery = `SELECT DISTINCT * ${fromSource}`;
        let filters: number[] = [];

        for (const plotfilter of _.filter(this.filters.loadedEntries, f => f.origin === plot.id)) {
            this.recalculateFilter(allData, plotfilter);
            if (plotfilter.includes.value.length > 0) {
                filters = _.union(filters, plotfilter.includes.value);
            }
        }

        filters = _.sortBy(filters);

        if (filters.length > 0 && plot.useFilter) {
            let filterQuery = ` WHERE ${ID_COLUMN} IN (`;
            filterQuery += filters.join(',');
            tableQuery += filterQuery + ')';
        }

        await this.db.run(`
            DROP VIEW IF EXISTS ${VIEW_PREFIX + plot.id};
            CREATE VIEW ${VIEW_PREFIX + plot.id} AS ${tableQuery};
        `, {}).toPromise();


        // determine filtered data
        if (plot.useFilter && filters.length > 0) {
            let filterCounter = 0;
            for (let i = 0; i < allData.length; i++ && filterCounter < filters.length) {
                const isFiltered = filters[filterCounter] === allData[i][0];

                if (isFiltered) {
                    allData[i][3] = 0;
                    filterCounter++;
                } else {
                    allData[i][3] = 1;
                }
            }
        }



        if (!_.isEqual(plot.data, allData)) {
            plot.data = allData;
        } else {
            this.logDebug('Skipping data update: No changes');
        }
    }

    private removePlot(plot: Plot): void {
        this.db.run(`DROP VIEW IF EXISTS ${VIEW_PREFIX + plot.id}`, {});
    }



    // orders plots so that upstream plots are initialized first
    private orderPlots(plots: Plot[]): Plot[] {
        const orderedPlots: Plot[] = [];
        let i = 0;

        while (orderedPlots.length < plots.length) {
            const plot = plots[i];

            if (orderedPlots.indexOf(plot) < 0) {
                const upstream = this.getUpstreamIds(plot);

                if (upstream.length === 0) {
                    orderedPlots.push(plot);
                } else {
                    let allDependenciesMet = true;
                    for (const id of upstream) {
                        allDependenciesMet = allDependenciesMet && _.find(orderedPlots, p => p.id === id) !== undefined;
                    }
                    if (allDependenciesMet) {
                        orderedPlots.push(plot);
                    }
                }
            }

            i = (i + 1) % plots.length;
        }

        return orderedPlots;
    }


    private getSource(plot: Plot): string {
        const upstreamIds = this.getUpstreamIds(plot);


        if (upstreamIds.length === 0) {
            return `FROM ${SOURCE_TABLE}`;
        }


        const sources = _(upstreamIds)
            .map(id => `SELECT * FROM ${VIEW_PREFIX + id}`)
            .join(' UNION ALL ');

        return `FROM (${sources}) AS ${SOURCE_TABLE}`;
    }


    private async triggerCascadingChanges(start: Plot, currentTransactionId: number) {
        for (const id of this.getDownstreamIds(start)) {
            const child = this.plots.findLoadedEntry({ id: id });
            if (child) {
                if (currentTransactionId === this.transactionId) {
                    await this.updatePlotData(child);
                    this.triggerCascadingChanges(child, currentTransactionId);
                } else {
                    this.logWarning('Transaction ID has changed, rescheduling change propagation');
                    this.slowPlotUpdateStream.next(child);
                }
            } else {
                this.logError(`Unable to find plot ${id}`);
            }
        }
    }


    private recalculateFilter(data: [number, number, number, number][], f: Filter): void {
        const includes = [];

        if (f.path && f.path.length > 0) {
            const boundingRect = PointUtils.buildBoundingRect(f.path);

            for (let i = 0; i < data.length; i++) {
                const d: Point = [data[i][1] || Number.EPSILON, data[i][2] || Number.EPSILON];
                if (PointUtils.isInPolygon(d, f.path, boundingRect)) {
                    includes.push(data[i][0]);
                }
            }
        }

        f.includes.next(includes);
    }


    private getUpstreamIds(plot: Plot): number[] {
        return _(this.links.loadedEntries)
            .filter(l => l.downstream === plot.id)
            .filter(l => _.find(this.plots.loadedEntries, p => p.id === l.upstream) !== undefined)
            .map(l => l.upstream)
            .filter(id => id !== -1)
            .value() || [];
    }

    private getDownstreamIds(plot: Plot): number[] {
        return _(this.links.loadedEntries)
            .filter(l => l.upstream === plot.id)
            .filter(l => _.find(this.plots.loadedEntries, p => p.id === l.downstream) !== undefined)
            .map(l => l.downstream)
            .filter(id => id !== -1)
            .value() || [];
    }
}

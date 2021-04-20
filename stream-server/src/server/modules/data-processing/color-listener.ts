import * as _ from 'lodash';
import { Service, Color, Utils, Message, NC_COLOR } from '../core';
import { Manager } from '../database';
import { Plot, Link, PlotUtils } from '../plots';
import { filter, map, sampleTime } from 'rxjs/operators';
import { UnityServerProxy } from '../unity';
import { merge, BehaviorSubject } from 'rxjs';
import { Filter as PlotFilter } from './filter';
import { DataProvider } from '../data-provider';
import { SocketIOServer } from '../web-clients';

interface ColorTable {
    id: number;
    plotIds: number[];
    // [r, g, b, a][]
    colors: [number, number, number, number][];
}

const DEFAULT_COLOR_UNCOLORED: [number, number, number, number] = [255, 255, 255, 127];
const DEFAULT_COLOR_NOFILTER: [number, number, number, number] = [255, 255, 255, 255];

const FILTER_INCLINE_GRADIENT: Color[] = [
    { r: 76, g: 175, b: 80, a: 255 }, // green 500
    { r: 255, g: 255, b: 255, a: 255 }, // white
    { r: 244, g: 67, b: 54, a: 255 }, // red 500
];

const DEFAULT_COLOR_GRADIENT: Color[] = [
    { r: 33, g: 150, b: 243, a: 255}, // blue 500
    { r: 255, g: 235, b: 59, a: 255}, // yellow 500
];

export class ColorListener extends Service {
    public serviceName = 'ColorListener';
    public groupName = 'data';


    public readonly colorTables: ColorTable[] = [];
    private idCounter = 1;


    public constructor(
        private plots: Manager<Plot>,
        private links: Manager<Link>,
        private filters: Manager<PlotFilter>,
        private dataProvider$: BehaviorSubject<DataProvider>,
        private unityServer: UnityServerProxy,
        private socketServer: SocketIOServer) {
        super();


        /**
         *  DataTables remote init
         */
        unityServer.arMessages$.pipe(
            filter(msg => msg.channel === NC_COLOR)
        ).subscribe(msg => {
            if (msg.command === 'request') {
                this.unityServer.broadcast({
                    channel: NC_COLOR,
                    command: 'request',
                    payload: this.colorTables
                }, [msg.origin]);
            } else {
                this.logError(`Unknown command ${msg.command} on 'color' channel!`);
            }
        });

        socketServer.messages$.pipe(
            filter(msg => msg.channel === NC_COLOR)
        ).subscribe(msg => {
            if (msg.command === 'request') {
                socketServer.broadcast({
                    channel: NC_COLOR,
                    command: 'request',
                    payload: this.colorTables
                }, [msg.origin]);
            } else {
                this.logError(`Unknown command ${msg.command} on 'color' channel!`);
            }
        });
    }


    public async init() {
        super.init();

        if (this.dataProvider$.value) {
            await this.dataProvider$.value.initialized$.toPromise();
        }

        /**
         *  Ensure only one plot has 'useColor' attribute
         */
        this.plots.modelChanges$.pipe(
            filter(ev => ev.changes.indexOf('useColor') >= 0)
        ).subscribe(ev => {
            this.setUniqueColor(ev.model.id, 'plot');
        });


        this.links.modelChanges$.pipe(
            filter(ev => ev.changes.indexOf('upstream') >= 0
            || ev.changes.indexOf('downstream') >= 0
            || ev.changes.indexOf('useColor') >= 0)
        ).subscribe(ev => {
            this.setUniqueColor(ev.model.id, 'link');

            const ct = this.getColorTable(ev.model.upstream >= 0 ? ev.model.upstream : ev.model.downstream);
            if (ct) {
                try {
                    this.updateColor(ct);
                } catch (e) {
                    this.logError(e);
                }
            }
        });

        this.links.modelDeleted$.subscribe(m => {
            if (m.upstream >= 0) {
                this.setUniqueColor(m.upstream, 'plot');
            }

            if (m.downstream >= 0) {
                this.setUniqueColor(m.downstream, 'plot');
            }
        });


        /**
         *  Recalculate colours
         */
        merge(
            this.links.modelCreated$,
            this.links.modelDeleted$,
            this.links.modelChanges$.pipe(
                filter(ev => ev.changes.indexOf('upstream') >= 0
                    || ev.changes.indexOf('downstream') >= 0),
                map(ev => ev.model))
        ).subscribe(() => {
            this.checkGroups();
        });

        merge(this.plots.modelCreated$, this.plots.modelDeleted$).subscribe(m => {
            this.checkGroups();
        });

        this.plots.modelCreated$.subscribe(m => {
            this.createColorTable([m.id]);
        });

        this.plots.modelDeleted$.subscribe(m => {
            const ct = this.getColorTable(m.id);
            if (ct) {
                _.pull(ct.plotIds, m.id);
                if (ct.plotIds.length === 0) {
                    this.removeColorTable(ct);
                }
            }
        });

        // colour changes
        this.plots.modelChanges$.pipe(
            filter(ev => ev.changes.indexOf('data') >= 0
                || ev.changes.indexOf('useColor') >= 0)
        ).subscribe(ev => {
            // recalculate colour for ev.model group
            const colorTable = this.getColorTable(ev.model.id);
            if (colorTable) {
                try {
                    this.updateColor(colorTable);
                } catch (e) {
                    this.logError(e);
                }
            }
        });

        this.plots.modelChanges$.pipe(
            filter(ev => ev.changes.indexOf('useColor') >= 0)
        ).subscribe(ev => {
            this.setUniqueColor(ev.model.id, 'plot');
        });

        // filter changes for coloured plots
        merge(
            this.filters.modelCreated$,
            this.filters.modelDeleted$,
            this.filters.modelChanges$.pipe(map(ev => ev.model)),
            PlotFilter.Include$
        ).pipe(filter(model => {
            const origin = this.plots.findLoadedEntry({ id: model.origin });
            return origin && origin.useColor;
        })).subscribe(model => {
            // update colour for ev.model.origin group
            const colorTable = this.getColorTable(model.origin);
            if (colorTable) {
                try {
                    this.updateColor(colorTable);
                } catch (e) {
                    this.logError(e);
                }
            }
        });

        this.initColorTables(this.plots.loadedEntries);
    }

    private setUniqueColor(startId: number, startType: 'plot' | 'link'): void {

        let colorId = -1;
        let colorType = '';

        let startPlotId = -1;
        if (startType === 'plot') {
            startPlotId = startId;
            const plot = this.plots.findLoadedEntry({ id: startId });
            if (!plot) {
                // probably deleted
                return;
            }
            if (plot.useColor) {
                colorId = plot.id;
                colorType = 'plot';
            }
        } else {
            const link = this.links.findLoadedEntry({ id: startId });
            if (!link) {
                this.logError(`Unable to find link ${startId}`);
                return;
            }
            startPlotId = (link.upstream === -1) ? link.downstream : link.upstream;

            if (link.useColor) {
                colorId = link.id;
                colorType = 'link';
            }
        }

        const connectedPlots = PlotUtils.getConnectedPlots(this.plots, this.links, startPlotId);

        for (const plot of connectedPlots) {

            // determine unique color for plot
            if (plot.useColor) {
                if (colorType === '') {
                    colorType = 'plot';
                    colorId = plot.id;
                } else if (colorType !== 'plot' || colorId !== plot.id) {
                    plot.useColor = false;
                }
            }

            // check adjacent lines for unique color
            const adjacentLinks = _.filter(this.links.loadedEntries, l => l.upstream === plot.id || l.downstream === plot.id);
            for (const link of adjacentLinks) {
                if (link.useColor) {
                    if (colorType === '') {
                        colorType = 'link';
                        colorId = link.id;
                    } else if (colorType !== 'link' || colorId !== link.id) {
                        link.useColor = false;
                    }
                }
            }
        }
    }


    private initColorTables(plots: Plot[]): void {
        for (const plot of plots) {
            const existingCt = this.getColorTable(plot.id);

            if (!existingCt) {
                this.createColorTable(PlotUtils.getConnectedPlots(this.plots, this.links, plot.id).map(p => p.id));
            }
        }
    }

    private createColorTable(plotIds: number[]): ColorTable {
        const table: ColorTable = {
            id: this.idCounter++,
            colors: [],
            plotIds: plotIds || []
        };

        try {
            this.updateColor(table);
        } catch (e) {
            this.logError(e);
        }
        this.addColorTable(table);

        return table;
    }

    private checkGroups(): void {

        const removedTables: ColorTable[] = [];

        for (let i = 0; i < this.colorTables.length; i++) {
            const ct = this.colorTables[i];

            // marked for removal
            if (removedTables.indexOf(ct) >= 0) {
                continue;
            }

            if (ct.plotIds.length === 0) {
                // table is invalid -> delete
                removedTables.push(ct);
                continue;
            }

            const connectedPlots = PlotUtils.getConnectedPlots(this.plots, this.links, ct.plotIds[0]);

            const targetPlots = _.sortBy(connectedPlots).map(p => p.id);
            const currentPlots = _.sortBy(ct.plotIds);

            if (_.isEqual(targetPlots, currentPlots)) {
                continue;
            }

            ct.plotIds = targetPlots;

            // plot has been removed from table (probably split off after link deletion)
            const removedPlotIds = _.difference(currentPlots, targetPlots);
            const removedPlots = _(removedPlotIds)
                .map(id => this.plots.findLoadedEntry({ id: id }))
                .filter(p => !!p)
                .value() as Plot[];
            this.initColorTables(removedPlots as Plot[]);

            // plots have been added, possibly after creating link
            const addedPlotIds = _.difference(targetPlots, currentPlots);
            for (const id of addedPlotIds) {
                const duplicateTable = this.getColorTable(id);
                if (duplicateTable && removedTables.indexOf(duplicateTable) < 0) {
                    removedTables.push(duplicateTable);
                }
            }

            try {
                this.updateColor(ct, true);
            } catch (e) {
                this.logError(e);
            }
        }

        for (const table of removedTables) {
            this.removeColorTable(table);
        }
    }

    private updateColor(colorTable: ColorTable, forceUpdate = false): void {
        try {
            const colorPlotId = _.find(colorTable.plotIds, id => {
                const plot = this.plots.findLoadedEntry({ id: id });
                return plot && plot.useColor;
            });
            const colorPlot = this.plots.findLoadedEntry({ id: colorPlotId });

            let colorLink: Link;
            for (const plotId of colorTable.plotIds) {
                const cl = _.find(this.links.loadedEntries, l => l.useColor && (l.upstream === plotId || l.downstream === plotId));
                if (cl) {
                    colorLink = cl;
                    break;
                }
            }

            if (!this.dataProvider$.value) {
                return;
            }

            const dataCount = this.dataProvider$.value.rawData.length;

            const oldColors = colorTable.colors;
            colorTable.colors = [];
            if (colorPlot) {
                const colorFilters = _.filter(this.filters.loadedEntries, f => f.origin === colorPlot.id);

                const defaultColor = colorFilters.length === 0 ? DEFAULT_COLOR_NOFILTER : DEFAULT_COLOR_UNCOLORED;

                // set default colour in case something was filtered out
                let minY = 1;
                let maxY = 0;
                for (let i = 0; i < colorPlot.data.length; i++) {
                    minY = Math.min(minY, colorPlot.data[i][2] || 0);
                    maxY = Math.max(maxY, colorPlot.data[i][2] || 0);
                }

                if (minY === maxY) {
                    minY = Math.max(0, minY - 0.001);
                    maxY = Math.min(1, maxY + 0.001);
                }

                for (let i = 0; i < dataCount; i++) {
                    colorTable.colors.push(this.addRandomColorOffset(i, defaultColor));
                }

                for (let i = 0; i < colorPlot.data.length; i++) {
                    const id = colorPlot.data[i][0];

                    for (const colorFilter of colorFilters) {
                        if (colorFilter.includes.value.indexOf(id) >= 0) {
                            colorTable.colors[id] = this.addRandomColorOffset(id, this.getColorFromFilter(colorPlot.data[i], colorFilter));
                            break;
                        }
                    }

                    if (colorFilters.length === 0) {
                        colorTable.colors[id] = this.addRandomColorOffset(id, this.getColor(colorPlot.data[i], DEFAULT_COLOR_GRADIENT, [[0, minY], [1, maxY]]));
                    }
                }
            } else if (colorLink) {

                // set default colour in case something was filtered out
                for (let i = 0; i < dataCount; i++) {
                    colorTable.colors.push(this.addRandomColorOffset(i, DEFAULT_COLOR_UNCOLORED));
                }

                const upstream = this.plots.findLoadedEntry({ id: colorLink.upstream });
                const downstream = this.plots.findLoadedEntry({ id: colorLink.downstream });

                if (!upstream || !downstream || !upstream.data || !downstream.data) {
                    this.logError(`Unable to find upstream or downstream for link ${colorLink.id}`);
                    return;
                }

                let maxInclination = 0.00001;
                let minInclination = -0.00001;

                let j = 0;
                for (let i = 0; i < upstream.data.length; i++) {
                    const dataId = upstream.data[i][0];

                    while ((j + 1) < downstream.data.length && downstream.data[j][0] < dataId) {
                        j++;
                    }


                    if (downstream.data[j][0] === upstream.data[i][0]) {
                        const inclination = downstream.data[j][2] - upstream.data[i][2];
                        if (inclination > 0) {
                            maxInclination = Math.max(maxInclination, inclination);
                        } else {
                            minInclination = Math.min(minInclination, inclination);
                        }
                    }
                }

                j = 0;
                for (let i = 0; i < upstream.data.length; i++) {
                    const id = upstream.data[i][0];

                    while ((j + 1) < downstream.data.length && downstream.data[j][0] < id) {
                        j++;
                    }

                    if (downstream.data[j][0] === upstream.data[i][0]) {
                        let inclination = downstream.data[j][2] - upstream.data[i][2];

                        if (inclination > 0) {
                            inclination = ((inclination / maxInclination) / 2) + 0.5;
                        } else {
                            inclination = (1 - (inclination / minInclination)) / 2;
                        }

                        colorTable.colors[id] = this.addRandomColorOffset(id, this.getColor([0, 0, inclination], FILTER_INCLINE_GRADIENT));
                    }
                }



            } else {
                // no colour set -> default colour
                for (let i = 0; i < dataCount; i++) {
                    colorTable.colors.push(this.addRandomColorOffset(i, DEFAULT_COLOR_NOFILTER));
                }
            }

            if (!_.isEqual(oldColors, colorTable.colors) || forceUpdate) {
                this.updateColorTable(colorTable);
            }
        } catch (e) {
            this.logError(e.stack, false);
        }
    }


    private getColorFromFilter(data: number[], plotFilter: PlotFilter): [number, number, number, number] {
        return this.getColor(data, plotFilter.dataColors, plotFilter.boundingRect);
    }

    private getColor(data: number[], colors: Color[], boundingRect?: [number, number][]): [number, number, number, number] {
        if (colors.length === 1) {
            return [colors[0].r, colors[0].g, colors[0].b, colors[0].a];
        } else if (colors.length > 1) {
            const br = boundingRect || [[0, 0], [1, 1]];
            // TODO: horizontal gradients?
            const val = data[2] || 0;
            const y = Math.abs((val - br[1][1]) / ((br[1][1] - br[0][1])));
            const c = Utils.getGradientColor(colors, y);
            return [c.r, c.g, c.b, c.a];
        }

        // invalid...
        return [0, 0, 0, 0];
    }


    private updateColorTable(colorTable: ColorTable): void {
        const msg: Message = {
            channel: NC_COLOR,
            command: 'update',
            payload: colorTable
        };
        this.unityServer.broadcast(msg, this.unityServer.currentArClients);
        this.socketServer.broadcast(msg);
    }

    private addColorTable(ct: ColorTable): void {
        this.colorTables.push(ct);

        const msg: Message = {
            channel: NC_COLOR,
            command: 'add',
            payload: ct
        };
        this.unityServer.broadcast(msg, this.unityServer.currentArClients);
        this.socketServer.broadcast(msg);
    }

    private getColorTable(containsPlot: number): ColorTable {
        return _.find(this.colorTables, ct => ct.plotIds.indexOf(containsPlot) >= 0);
    }

    private removeColorTable(ct: ColorTable): void {
        _.pull(this.colorTables, ct);

        const msg: Message = {
            channel: NC_COLOR,
            command: 'remove',
            payload: { id: ct.id }
        };
        this.unityServer.broadcast(msg, this.unityServer.currentArClients);
        this.socketServer.broadcast(msg);
    }


    private addRandomColorOffset(seed: number, col: [number, number, number, number]): [number, number, number, number] {
        return [
            /*r*/ Math.max(0, Math.min(col[0] + this.pseudoRandom(seed, -30, 10), 255)),
            /*g*/ Math.max(0, Math.min(col[1] + this.pseudoRandom(seed, -30, 10), 255)),
            /*b*/ Math.max(0, Math.min(col[2] + this.pseudoRandom(seed, -30, 10), 255)),
            /*a*/ col[3]
        ];
    }

    private pseudoRandom(seed: number, min: number, max: number) {
        const x = Math.sin(seed) * 10000;
        return Math.floor((x - Math.floor(x)) * (max - min) + min);
    }
}

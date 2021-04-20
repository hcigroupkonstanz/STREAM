import * as d3 from 'd3';
import * as _ from 'lodash';
import { Component, Input, ViewChild, OnChanges, AfterViewInit, SimpleChanges, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Plot } from '@stream/models';
import { ChartDirective } from '@stream/directives';
import { Logger, DataDimensionService, FilterService, ColortableService } from '@stream/services';
import { ScatterplotVisualisation } from './scatterplot-visualisation';
import { ChartAxis } from './chart-axis';
import { untilDestroyed } from 'ngx-take-until-destroy';
import { filter, auditTime } from 'rxjs/operators';
import { DataLabels } from './data-labels';
import { merge } from 'rxjs';

@Component({
    selector: 'app-chart2d',
    templateUrl: './chart2d.component.html',
    styleUrls: ['./chart2d.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class Chart2dComponent implements AfterViewInit, OnChanges, OnDestroy {

    @Input() plot: Plot = null;
    @Input() width = 600;
    @Input() height = 600;
    @Input() margin = { top: 10, right: 10, bottom: 150, left: 150 };
    @Input() invertX = false;

    @ViewChild(ChartDirective, { static: false }) public chart: ChartDirective;


    private isLoaded = false;

    public dataVisualisation: ScatterplotVisualisation;
    public labels: DataLabels;
    public xAxis: ChartAxis;
    public yAxis: ChartAxis;

    constructor(
        private dimensions: DataDimensionService,
        private filters: FilterService,
        private colorTableService: ColortableService,
        private logger: Logger) { }


    async ngAfterViewInit() {
        this.isLoaded = true;
        this.initialize();

        this.plot.remoteModelChanges$
            .pipe(
                filter(changes => _.includes(changes, 'data')),
                auditTime(250),
                untilDestroyed(this))
            .subscribe(() => this.initialize());

        this.colorTableService.remoteUpdates$
            .pipe(
                auditTime(10),
                untilDestroyed(this))
            .subscribe(() => this.initialize());
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.isLoaded) {
            this.initialize();
        }
    }

    ngOnDestroy() {
        // for take-until-destroy
    }

    private async initialize() {
        if (!this.dataVisualisation) {
            this.dataVisualisation = new ScatterplotVisualisation();
            this.chart.addElement(this.dataVisualisation);
            this.xAxis = new ChartAxis('x');
            this.chart.addElement(this.xAxis);
            this.yAxis = new ChartAxis('y');
            this.chart.addElement(this.yAxis);
            this.labels = new DataLabels();
            this.chart.addElement(this.labels);
        }

        this.xAxis.setInvertX(this.invertX);

        try {
            if (this.plot.dimX && !this.plot.useSort) {
                const dimX = await this.dimensions.getDimension(this.plot.dimX);
                this.xAxis.setDimension(dimX);
            } else {
                this.xAxis.setDimension(null);
            }

            if (this.plot.dimY) {
                const dimY = await this.dimensions.getDimension(this.plot.dimY);
                this.yAxis.setDimension(dimY);
            }

            if ((this.plot.dimX || this.plot.useSort) && this.plot.dimY) {
                const scaleX = this.getScale('x');
                const scaleY = this.getScale('y');
                const colorTable = await this.colorTableService.getColors(this.plot.id);
                this.dataVisualisation.loadData(this.plot, colorTable, scaleX, scaleY);


                if (this.plot.data.length <= 10) {
                    this.labels.loadData(this.plot, scaleX, scaleY);
                    this.yAxis.showSpecificData(this.plot.data);
                    this.xAxis.showSpecificData(this.plot.data);
                } else {
                    this.labels.clear();
                    this.yAxis.showAll();
                    this.xAxis.showAll();
                }
            } else {
                this.dataVisualisation.clearData();
            }
        } catch (e) {
            this.logger.error(e.message);
        }
    }


    private getScale(type: 'x' | 'y') {
        const range = type === 'x' ? [0, this.width] : [this.height, 0];
        const domain = (this.invertX && type === 'x') ? [1, 0] : [0, 1];
        return d3.scaleLinear().range(range).domain(domain);
    }

    public setAttributes(attributes: any[]): void {
        if (this.dataVisualisation) {
            this.dataVisualisation.setAttributes(attributes);
        }
    }
}

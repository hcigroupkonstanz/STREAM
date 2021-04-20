import * as _ from 'lodash';
import { PlotService, DataDimensionService } from '@stream/services';
import { Plot, WebClient } from '@stream/models';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-plot-debug-view',
    templateUrl: './plot-debug-view.component.html',
    styleUrls: ['./plot-debug-view.component.scss']
})
export class PlotDebugViewComponent implements OnInit, OnDestroy {
    plot: Plot;
    client = WebClient.Instance;
    colors = [];

    constructor(
        private route: ActivatedRoute,
        private plots: PlotService,
        public dims: DataDimensionService
    ) { }

    ngOnInit() {
        this.route.paramMap.subscribe(async params => {
            this.plot = await this.plots.getPlot(Number(params.get('id')));
        });

        this.colors = this.plots.defaultColors;
    }

    // for untilDestroyed()
    ngOnDestroy() {
    }

    changePos() {
        this.plot.position = [Math.random(), Math.random(), Math.random()];
    }

    getId(plot: Plot): number {
        return plot.id;
    }


    delete() {
        this.plots.remove(this.plot.id);
    }

    setColor(color: string) {
        this.plot.color = color;
    }
}

import * as _ from 'lodash';
import {
    Component,
    Input,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    ViewChild,
    OnDestroy,
    ElementRef,
    OnInit,
    AfterViewInit
} from '@angular/core';
import { Plot, Filter, WebClient } from '@stream/models';
import { ActionsService, FilterService, PlotService, DataDimensionService, OwnerService } from '@stream/services';
import { PathContainer } from '../chart2d/path-container';
import { Chart2dComponent } from '../chart2d/chart2d.component';
import { PathSelection } from '../chart2d/path-selection';
import { GesturePanel } from './gesture-panel';
import { untilDestroyed } from 'ngx-take-until-destroy';
import { filter, delay, take, takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, merge, Subject } from 'rxjs';
import { Location } from '@angular/common';
import { Utils } from '@stream/root/utils';
import { GestureAxis } from './gesture-axis';

@Component({
    selector: 'app-scatter-plot',
    templateUrl: './scatter-plot.component.html',
    styleUrls: ['./scatter-plot.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScatterPlotComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() margin = { top: 40, right: 40, bottom: 150, left: 150 };

    @ViewChild(Chart2dComponent, { static: false }) private chart: Chart2dComponent;

    dialogDimensionX = false;
    dialogDimensionY = false;

    selectedFilter: Filter = null;

    dimX = '';
    dimY = '';

    private pathContainer: PathContainer;
    private readonly pathSelections: PathSelection[] = [];

    private gesturePanel: GesturePanel;
    private gestureAxisX: GestureAxis;
    private gestureAxisY: GestureAxis;
    private isInitialized = new BehaviorSubject(false);

    // to clean up previous listeners
    private initSubject = new Subject<void>();
    private readonly currentFilters: Filter[] = [];
    plot: Plot;

    loadedMetadata: string;

    private isDestroyed = false;

    constructor(
        private location: Location,
        private actions: ActionsService,
        private filterProvider: FilterService,
        private elementRef: ElementRef,
        private route: ActivatedRoute,
        private router: Router,
        private plots: PlotService,
        public dimensions: DataDimensionService,
        public ownerService: OwnerService,
        private changeDetector: ChangeDetectorRef) {
    }

    ngOnInit() {
        this.ownerService.CurrentOwner
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                const owner = this.ownerService.CurrentOwner.value;
                if (owner) {
                    // TODO: technically, owner may change.. but is unlikely therefore ignored
                    owner.modelChanges$
                        .pipe(untilDestroyed(this), filter(c => c.includes('selectedMetadata')))
                        .subscribe(() => {
                            this.loadedMetadata = owner.selectedMetadata;
                            this.init(this.plot);
                            this.changeDetector.detectChanges();
                        });
                    this.loadedMetadata = owner.selectedMetadata;
                }
            });

        this.route.paramMap.subscribe(async params => {
            const plot = await this.plots.getPlot(Number(params.get('id')));
            this.plot = plot;
            this.init(plot);
            if (!this.isDestroyed) {
                this.changeDetector.detectChanges();
            }
        });
    }

    ngAfterViewInit() {
        this.isInitialized.next(true);
    }


    private async init(plot: Plot) {
        await this.isInitialized.pipe(filter(v => v), take(1), delay(1)).toPromise();

        if (!this.pathContainer) {
            this.pathContainer = new PathContainer();
            this.chart.chart.addBackgroundElement(this.pathContainer);

            this.gesturePanel = new GesturePanel(plot, this.filterProvider);
            this.chart.chart.addForegroundElement(this.gesturePanel);

            this.gestureAxisX = new GestureAxis('x', 's', plot, this.filterProvider);
            this.chart.chart.addForegroundElement(this.gestureAxisX);

            this.gestureAxisY = new GestureAxis('y', 's', plot, this.filterProvider);
            this.chart.chart.addForegroundElement(this.gestureAxisY);

            this.filterProvider.filterCreated$
                .pipe(
                    filter(f => f.origin === plot.id),
                    untilDestroyed(this))
                .subscribe(newFilter => {
                    this.addFilter(newFilter);
                });

            this.filterProvider.filterDeleted$
                .pipe(
                    filter(f => f.origin === plot.id),
                    untilDestroyed(this))
                .subscribe(removedFilter => {
                    this.removeFilter(removedFilter);
                });

            merge(
                this.gesturePanel.onClick$,
                this.gestureAxisX.onClick$,
                this.gestureAxisY.onClick$
            )
                .pipe(untilDestroyed(this), delay(50))
                .subscribe(ev => {
                    if (!this.isDestroyed) {
                        this.selectedFilter = ev.filter;
                        this.changeDetector.detectChanges();
                    }
                });
        } else {
            this.gesturePanel.setPlot(plot);
            this.gestureAxisX.setPlot(plot);
            this.gestureAxisY.setPlot(plot);
        }

        this.gesturePanel.invertX = this.loadedMetadata !== 'front';
        this.gestureAxisX.invertX = this.loadedMetadata !== 'front';

        this.initSubject.next();

        plot.modelChanges$
            .pipe(takeUntil(this.initSubject))
            .subscribe(() => this.updateDimensions(plot));
        this.updateDimensions(plot);


        while (this.currentFilters.length > 0) {
            this.removeFilter(this.currentFilters.pop());
        }

        for (const f of this.filterProvider.filters) {
            if (f.origin === plot.id) {
                this.addFilter(f);
            }
        }

    }

    // for untilDestroyed
    ngOnDestroy() {
        this.isDestroyed = true;
        this.initSubject.next();
        this.initSubject.complete();

        if (this.selectedFilter) {
            this.selectedFilter.selectedBy = _.without(this.selectedFilter.selectedBy, WebClient.Instance.id);
        }
    }

    private async updateDimensions(plot: Plot) {
        if (plot.dimX) {
            this.dimensions.getDimension(plot.dimX).then(dimX => {
                if (!this.isDestroyed && dimX) {
                    this.dimX = dimX.displayName;
                    this.gestureAxisX.setDimension(dimX);
                    this.changeDetector.detectChanges();
                }
            });
        } else {
            this.dimX = '';
        }

        if (plot.dimY) {
            this.dimensions.getDimension(plot.dimY).then(dimY => {
                if (!this.isDestroyed && dimY) {
                    this.dimY = dimY.displayName;
                    this.gestureAxisY.setDimension(dimY);
                    this.changeDetector.detectChanges();
                }
            });
        } else {
            this.dimY = '';
        }
    }

    private addFilter(f: Filter): void {
        this.currentFilters.push(f);
        if (this.chart) {
            const path = new PathSelection(f, this.chart.chart, location.pathname, 's', this.loadedMetadata !== 'front');
            this.pathContainer.addPath(path);
            this.pathSelections.push(path);
        }
    }

    private removeFilter(f: Filter): void {
        _.pull(this.currentFilters, f);
        const paths = _.remove(this.pathSelections, p => p.filter === f);

        for (const path of paths) {
            this.pathContainer.removePath(path);
        }
    }

    togglePlotFilter() {
        this.actions.triggerTouch('plot_use_filter', {
            plot: this.plot.id
        });
    }

    back() {
        this.actions.triggerTouch('back', {});
    }

    openDimensionDialog(axis: 'x' | 'y') {
        if (axis === 'x') {
            this.dialogDimensionX = true;
        } else {
            this.dialogDimensionY = true;
        }

        if (!this.isDestroyed) {
            this.changeDetector.detectChanges();
        }
    }

    getButtonStyle(secondary: boolean): any {
        if (this.plot) {
            const plotColor = this.plot.color;
            const color = secondary ? Utils.getSecondaryColor(plotColor) : plotColor;
            return {
                'background-color': color
            };
        }

        return {};
    }
}

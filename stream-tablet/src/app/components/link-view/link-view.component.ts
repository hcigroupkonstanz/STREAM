import { PlotListComponent } from './../plot-list/plot-list.component';
import { FilterService } from './../../services/filter.service';
import * as d3 from 'd3';
import * as _ from 'lodash';
import { Link, Plot, Filter as PlotFilter, ColorTable, WebClient } from '@stream/models';
import {
    Component,
    OnInit,
    ElementRef,
    ChangeDetectorRef,
    Input,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    ChangeDetectionStrategy
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionsService, ColortableService, PlotService, LinkService, Logger, DataDimensionService, OwnerService } from '@stream/services';
import { ChartDirective } from '@stream/directives';
import { ParallelCoordinatesVisualisation } from './parallel-coordinates-visualisation';
import { ParallelCoordinatesAxis } from './parallel-coordinates-axis';
import { untilDestroyed } from 'ngx-take-until-destroy';
import { filter, delay, sampleTime, takeUntil } from 'rxjs/operators';
import { Subscription, merge, Subject } from 'rxjs';
import { PathContainer } from '../chart2d/path-container';
import { PathSelection } from '../chart2d/path-selection';
import { GestureAxis } from '../scatter-plot/gesture-axis';

@Component({
    selector: 'app-link-view',
    templateUrl: './link-view.component.html',
    styleUrls: ['./link-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkViewComponent implements AfterViewInit, OnInit, OnDestroy {

    @Input() width = 800;
    @Input() height = 800;
    @Input() margin = { top: 10, right: 150, bottom: 10, left: 150 };

    @ViewChild(ChartDirective, { static: true }) public chart: ChartDirective;

    dialogDimensionLeft = false;
    dialogDimensionRight = false;
    plotLeft: Plot;
    plotRight: Plot;
    selectedFilter: PlotFilter = null;

    dimLeft = 'None';
    dimRight = 'None';

    private link: Link;

    public dataVisualisation: ParallelCoordinatesVisualisation;
    public axisLeft: ParallelCoordinatesAxis;
    public axisRight: ParallelCoordinatesAxis;
    private gesturesLeft: GestureAxis;
    private gesturesRight: GestureAxis;

    private pathContainer: PathContainer;
    private readonly pathSelections: PathSelection[] = [];

    private isDestroyed = false;

    private readonly colorSubject = new Subject<ColorTable>();
    private readonly initSubject = new Subject<void>();
    private readonly plotSubject = new Subject<void>();

    private readonly loadedFilters: PlotFilter[] = [];

    loadedMetadata = '';

    hasOtherFiltersLeft = false;
    hasOtherFiltersRight = false;

    constructor(
        private elementRef: ElementRef,
        private route: ActivatedRoute,
        private router: Router,
        private plots: PlotService,
        private actions: ActionsService,
        private dimensions: DataDimensionService,
        private ownerService: OwnerService,
        private links: LinkService,
        private colors: ColortableService,
        private filters: FilterService,
        private logger: Logger,
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
                            this.init(this.link);
                            this.changeDetector.detectChanges();
                        });
                    this.loadedMetadata = owner.selectedMetadata;
                }
            });



        this.route.paramMap.subscribe(async params => {
            const link = await this.links.getLink(Number(params.get('id')));
            if (link) {
                this.init(link);
            }
        });
    }

    ngAfterViewInit() {
        this.initialize();
    }


    // for untilDestroyed
    ngOnDestroy() {
        this.isDestroyed = true;
        this.colorSubject.complete();
        this.initSubject.next();
        this.initSubject.complete();
        this.plotSubject.next();
        this.plotSubject.complete();

        if (this.selectedFilter) {
            this.selectedFilter.selectedBy = _.without(this.selectedFilter.selectedBy, WebClient.Instance.id);
        }
    }


    private async init(link: Link) {
        // clear previous obserables
        this.initSubject.next();

        this.link = link;
        link.modelChanges$.pipe(
            takeUntil(this.initSubject),
            filter(changes => changes.includes('upstream') || changes.includes('downstream')))
            .subscribe(() => this.loadPlots());

        await this.loadPlots(true);

        this.colors.remoteUpdates$
            .pipe(takeUntil(this.initSubject))
            .subscribe(async () => {
                const colorTable = await this.colors.getColors(this.plotLeft.id);
                if (this.dataVisualisation && colorTable) {
                    this.colorSubject.next(colorTable);
                }
            });

        this.colorSubject
            .pipe(takeUntil(this.initSubject), sampleTime(50))
            .subscribe(c => {
                if (this.dataVisualisation) {
                    this.dataVisualisation.updateColors(c);
                }
            });

        const boundAxis = this.loadedMetadata.includes('top') ? 'x' : 'y';
        const isFilterLeft = (f: PlotFilter) =>
            this.plotLeft && f.origin === this.plotLeft.id;

        const isFilterRight = (f: PlotFilter) =>
            this.plotRight && f.origin === this.plotRight.id;

        this.filters.filterCreated$
            .pipe(
                filter(f => isFilterLeft(f) || isFilterRight(f)),
                takeUntil(this.initSubject))
            .subscribe(f => {
                this.addFilter(f, isFilterLeft(f) ? 'left' : 'right');
                this.checkFilters();
            });

        this.filters.filterDeleted$
            .pipe(
                filter(f => isFilterLeft(f) || isFilterRight(f)),
                takeUntil(this.initSubject))
            .subscribe(removedFilter => {
                this.removeFilter(removedFilter);
            });


        this.filters.filterCreated$
            .pipe(takeUntil(this.initSubject))
            .subscribe(() => this.checkFilters());
        this.filters.filterDeleted$
            .pipe(takeUntil(this.initSubject))
            .subscribe(() => this.checkFilters());

        while (this.loadedFilters.length > 0) {
            this.removeFilter(this.loadedFilters.pop());
        }

        for (const f of this.filters.filters) {
            if (isFilterLeft(f)) {
                this.addFilter(f, 'left');
            }
            if (isFilterRight(f)) {
                this.addFilter(f, 'right');
            }
            this.checkFilters();
        }

    }


    private checkFilters() {
        const boundAxis = this.loadedMetadata.includes('top') ? 'x' : 'y';

        this.hasOtherFiltersLeft = false;
        this.hasOtherFiltersRight = false;

        for (const f of this.filters.filters) {
            if (this.plotLeft && f.origin === this.plotLeft.id && f.boundAxis !== boundAxis) {
                this.hasOtherFiltersLeft = true;
            }
            if (this.plotRight && f.origin === this.plotRight.id && f.boundAxis !== boundAxis) {
                this.hasOtherFiltersRight = true;
            }
        }

        this.changeDetector.detectChanges();
    }

    private async loadPlots(forceInit = false) {

        // clear previous obserables
        this.plotSubject.next();

        const idLeft = this.loadedMetadata.includes('ltr') ? this.link.upstream : this.link.downstream;
        this.plotLeft = await this.plots.getPlot(idLeft);
        if (this.plotLeft) {
            this.plotLeft.modelChanges$.pipe(
                takeUntil(this.plotSubject),
                filter(changes => changes.indexOf('data') >= 0))
                .subscribe(() => this.initialize());
        }

        const idRight = this.loadedMetadata.includes('ltr') ? this.link.downstream : this.link.upstream;
        this.plotRight = await this.plots.getPlot(idRight);
        if (this.plotRight) {
            this.plotRight.modelChanges$.pipe(
                takeUntil(this.plotSubject),
                filter(changes => changes.indexOf('data') >= 0))
                .subscribe(() => this.initialize());
        }

        this.initialize(forceInit);
    }


    private async initialize(forceInit = false) {
        if (!this.dataVisualisation) {
            this.dataVisualisation = new ParallelCoordinatesVisualisation();
            this.chart.addElement(this.dataVisualisation);
            this.axisLeft = new ParallelCoordinatesAxis('left');
            this.chart.addElement(this.axisLeft);
            this.axisRight = new ParallelCoordinatesAxis('right');
            this.chart.addElement(this.axisRight);
            this.pathContainer = new PathContainer();
            this.chart.addBackgroundElement(this.pathContainer);
            this.gesturesLeft = new GestureAxis('y', 'll', this.plotLeft, this.filters);
            this.chart.addForegroundElement(this.gesturesLeft);
            this.gesturesRight = new GestureAxis('y', 'lr', this.plotRight, this.filters);
            this.chart.addForegroundElement(this.gesturesRight);

            merge(
                this.gesturesLeft.onClick$,
                this.gesturesRight.onClick$
            )
                .pipe(untilDestroyed(this), delay(50))
                .subscribe(ev => {
                    if (!this.isDestroyed) {
                        this.selectedFilter = ev.filter;
                        this.changeDetector.detectChanges();
                    }
                });
        }

        try {

            const dimLeft = this.plotLeft ? (this.loadedMetadata.includes('top') ? this.plotLeft.dimX : this.plotLeft.dimY) : '';

            let sourceValid = false;
            if (this.plotLeft && dimLeft) {

                const colorTable = await this.colors.getColors(this.plotLeft.id);
                if (colorTable) {
                    this.colorSubject.next(colorTable);
                }

                sourceValid = true;
                const dim = await this.dimensions.getDimension(dimLeft);
                this.axisLeft.setDimension(dim);
                this.gesturesLeft.setDimension(dim);
                this.gesturesLeft.setPlot(this.plotLeft);
                this.dimLeft = dim ? dim.displayName : 'None';
            } else {
                this.gesturesLeft.setDimension(null);
                this.gesturesLeft.setPlot(this.plotLeft);
            }

            const dimRight = this.plotRight ? (this.loadedMetadata.includes('top') ? this.plotRight.dimX : this.plotRight.dimY) : '';

            let targetValid = false;
            if (this.plotRight && dimRight) {
                targetValid = true;
                const dim = await this.dimensions.getDimension(dimRight);
                this.axisRight.setDimension(dim);
                this.gesturesRight.setDimension(dim);
                this.gesturesRight.setPlot(this.plotRight);
                this.dimRight = dim ? dim.displayName : 'None';
            } else {
                this.gesturesRight.setDimension(null);
                this.gesturesRight.setPlot(this.plotRight);
            }

            if (sourceValid && targetValid) {
                const scaleSource = d3.scaleLinear().range([this.height, 0]).domain([0, 1]);
                const scaleTarget = d3.scaleLinear().range([this.height, 0]).domain([0, 1]);
                this.dataVisualisation.loadData(this.plotLeft.data, this.plotRight.data, scaleSource, scaleTarget, 'y', forceInit);
            } else if (this.plotLeft && this.plotRight && this.plotLeft.data && this.plotRight.data) {
                const scaleSource = d3.scaleLinear().range([this.height, 0]).domain([0, 1]);
                const scaleTarget = d3.scaleLinear().range([this.height, 0]).domain([0, 1]);
                this.dataVisualisation.loadData(this.plotLeft.data, this.plotRight.data, scaleSource, scaleTarget, 'y', forceInit);
            } else {
                this.dataVisualisation.clearData();
            }

            if (!this.isDestroyed) {
                this.changeDetector.detectChanges();
            }
        } catch (e) {
            console.error(e);
        }
    }


    private addFilter(f: PlotFilter, side: 'left' | 'right'): void {
        this.loadedFilters.push(f);
        const mode = side === 'left' ? 'll' : 'lr';
        const path = new PathSelection(f, this.chart, location.pathname, mode);
        this.pathContainer.addPath(path);
        this.pathSelections.push(path);
    }

    private removeFilter(f: PlotFilter): void {
        _.pull(this.loadedFilters, f);
        const paths = _.remove(this.pathSelections, p => p.filter === f);

        for (const path of paths) {
            this.pathContainer.removePath(path);
        }
    }



    back() {
        this.actions.triggerTouch('back', {});
    }

    switchDirection() {
        this.actions.triggerTouch('link_invert', { link: this.link.id });

        // minor workaround...
        if (this.loadedMetadata.includes('rtl')) {
            this.loadedMetadata = this.loadedMetadata.replace('rtl', 'ltr');
        } else {
            this.loadedMetadata = this.loadedMetadata.replace('ltr', 'rtl');
        }

        this.changeDetector.detectChanges();
    }

    getBackground(dir: 'left' | 'right') {
        let color = '#FFFFFF';
        if (dir === 'left' && this.plotLeft) {
            color = this.plotLeft.color;
        }

        if (dir === 'right' && this.plotRight) {
            color = this.plotRight.color;
        }

        return {
            'background-color': color
        };
    }
}

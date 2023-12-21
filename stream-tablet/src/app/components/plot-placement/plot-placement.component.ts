import { PlotService, ActionsService } from '@stream/services';
import { Plot, WebClient } from '@stream/models';
import { Component, OnInit, ElementRef, Input, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from '@angular/router';
import { map, take, filter } from 'rxjs/operators';
import { Utils } from '@stream/root/utils';
import { untilDestroyed } from '@ngneat/until-destroy';

@Component({
    selector: 'app-plot-placement',
    templateUrl: './plot-placement.component.html',
    styleUrls: ['./plot-placement.component.scss']
})
export class PlotPlacementComponent implements OnInit, OnDestroy {

    plot: Plot = null;
    lockedToAxis = false;
    client = WebClient.Instance;

    @ViewChild('root', { static: true }) root: ElementRef;

    private hammer: HammerManager;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private actions: ActionsService,
        private plots: PlotService
    ) { }

    async ngOnInit() {
        const plot = await this.route.paramMap.pipe(
            take(1),
            map(async (params: ParamMap) => await this.plots.getPlot(Number(params.get('id')))))
            .toPromise();

        this.plot = plot;
        plot.lockedToAxis = false;

        const webClient = WebClient.Instance;

        webClient.modelChanges$
            .pipe(untilDestroyed(this), filter(c => c.includes('isVoiceActive')))
            .subscribe(() => {
                if (!webClient.isVoiceActive && plot.lockedToAxis) {
                    this.actions.triggerTouch('plot_place', { plot: this.plot.id }, true);
                }
            });


        this.hammer = new Hammer(this.root.nativeElement);
        this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 30 });
        this.hammer.get('swipe').set({ enable: false });
        this.hammer.get('doubletap').set({ enable: false });
        this.hammer.get('pinch').set({ enable: false });


        let prevEvent: HammerInput = null;
        this.hammer.on('panstart', e => {
            if (this.plot && this.plot.lockedToAxis) {
                e.srcEvent.preventDefault();
            }
            prevEvent = e;
        });
        this.hammer.on('pan', e => {
            if (this.plot && !this.plot.lockedToAxis) {
                this.handleSlide(e, prevEvent);
                prevEvent = e;
            }
        });

        this.hammer.on('press', e => {
            if (this.plot) {
                this.actions.triggerTouch('plot_lock', { plot: this.plot.id });
            }
        });

        this.hammer.on('pressup panend', e => {
            if (this.plot && this.plot.lockedToAxis) {
                this.actions.triggerTouch('plot_place', { plot: plot.id }, true);
            }
        });

        this.hammer.get('tap').set({ time: 700, threshold: 50 });
        this.hammer.on('tap', e => {
            this.actions.triggerTouch('plot_place', { plot: plot.id });
        });
    }

    ngOnDestroy() {
        if (this.hammer) {
            this.hammer.destroy();
            this.hammer = null;
        }
    }

    private handleSlide(current: HammerInput, prev: HammerInput): void {
        if (this.actions.ignoreTouch.value) {
            return;
        }

        const heightFactor = 500;
        const minOffset = 0.8;

        this.plot.positioningOffset = Math.max(this.plot.positioningOffset + (prev.deltaY - current.deltaY) / heightFactor, minOffset);
    }

    getStyle() {
        if (this.plot) {
            const plotColor = this.plot.color;
            const color = this.plot.lockedToAxis ? plotColor : Utils.getSecondaryColor(plotColor);
            return {
                'background-color': color
            };
        }

        return {};
    }
}

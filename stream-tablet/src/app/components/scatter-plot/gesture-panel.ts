import * as Hammer from 'hammerjs';
import * as _ from 'lodash';
import { HtmlChartElement, ChartElement } from '@stream/directives';
import { FilterService } from '@stream/services';
import { Filter, Plot, WebClient } from '@stream/models';
import { Point, PointUtils } from '@stream/root/point-utils';
import { Subject } from 'rxjs';
import { filter, takeWhile } from 'rxjs/operators';

export class GesturePanel extends ChartElement {

    private container: HtmlChartElement;
    private elementPosition: any;
    private width: number;
    private height: number;

    private onClickStream = new Subject<{ pos: Point, filter: Filter }>();
    public get onClick$() { return this.onClickStream.asObservable(); }

    public invertX = false;

    private activeFilter: Filter;

    public constructor(private plot: Plot, private filterService: FilterService) {
        super();
    }

    public setPlot(plot: Plot) {
        this.plot = plot;
    }

    public register(root: HtmlChartElement, width: number, height: number): void {
        this.container = root.append('rect');
        this.container.attr('fill', 'transparent');
        this.container.attr('width', `${width}px`);
        this.container.attr('height', `${height}px`);
        this.width = width;
        this.height = height;

        this.elementPosition = this.container.node().getBoundingClientRect();
        const hammerElement = new Hammer(this.container.node());

        hammerElement.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        hammerElement.on('panstart', event => this.createFilter(event));
        hammerElement.on('panmove', event => this.updateFilter(event, false));
        hammerElement.on('panend', event => this.finalizeFilter());

        hammerElement.on('tap', event => this.handleClick(event));
        hammerElement.on('press', event => this.handleClick(event));

        WebClient.Instance.modelChanges$
            .pipe(takeWhile(() => !!this.container), filter(c => c.includes('isVoiceActive')))
            .subscribe(() => {
                if (WebClient.Instance.isVoiceActive) {
                    this.finalizeFilter();
                }
            });

    }

    public unregister(): void {
        this.container.remove();
        this.container = null;
        this.finalizeFilter();
    }


    private createFilter(event: HammerInput): void {
        if (!this.plot || WebClient.Instance.isVoiceActive) {
            return;
        }

        this.activeFilter = this.filterService.create(this.plot);
        this.updateFilter(event, true);
    }

    private updateFilter(event: HammerInput, useOffset: boolean): void {
        if (this.activeFilter) {
            const pointerPos = event.center;
            const absolutePos: [number, number] = [pointerPos.x, pointerPos.y];
            if (useOffset) {
                absolutePos[0] -= event.deltaX;
                absolutePos[1] -= event.deltaY;
            }
            const relativePos = this.getRelativePosition(absolutePos);
            this.activeFilter.addPathPoint(relativePos);
        }
    }

    private finalizeFilter(): void {
        if (this.activeFilter) {
            this.filterService.finalizeFilter(this.activeFilter);
            this.activeFilter = null;
        }
    }


    private handleClick(event: HammerInput): void {
        const pointerPos = event.center;
        const relativePos = this.getRelativePosition([pointerPos.x, pointerPos.y]);
        const pos: Point = [event.center.x, event.center.y];

        for (const pf of _.filter(this.filterService.filters, f => f.origin === this.plot.id)) {
            if (PointUtils.isInRectangle(relativePos, [[pf.minX, pf.minY], [pf.maxX, pf.maxY]])) {
                this.onClickStream.next({
                    pos: pos,
                    filter: pf
                });
                return;
            }
        }

        this.onClickStream.next({
            pos: pos,
            filter: null
        });
    }


    private getRelativePosition(pos: Point): Point {
        let relativePosX = 0;
        if (this.invertX) {
            relativePosX = 1 - (pos[0] - this.elementPosition.x) / this.elementPosition.width;
        } else {
            relativePosX = (pos[0] - this.elementPosition.x) / this.elementPosition.width;
        }

        const relativePosY = 1 - ((pos[1] - this.elementPosition.y) / this.elementPosition.height);
        return [relativePosX, relativePosY];
    }
}

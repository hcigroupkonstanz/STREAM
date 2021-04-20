import * as Hammer from 'hammerjs';
import * as _ from 'lodash';
import { HtmlChartElement, ChartElement } from '@stream/directives';
import { FilterService } from '@stream/services';
import { Filter, Plot, DataDimension, WebClient } from '@stream/models';
import { Point, PointUtils } from '@stream/root/point-utils';
import { Subject } from 'rxjs';
import { filter, takeWhile } from 'rxjs/operators';

export class GestureAxis extends ChartElement {

    private container: HtmlChartElement;
    private elementPosition: any;
    private width: number;
    private height: number;

    private dimension: DataDimension;

    private activeFilter: Filter;
    private startPos: number;

    private onClickStream = new Subject<{ pos: Point, filter: Filter }>();
    public get onClick$() { return this.onClickStream.asObservable(); }

    public invertX = false;
    public invertY = false;

    public constructor(
        private type: 'x' | 'y',
        private mode: 'll' | 'lr' | 's', // linkLeft, linkRight, scatterplot
        private plot: Plot,
        private filterService: FilterService) {
        super();
    }

    public setDimension(dim: DataDimension) {
        this.dimension = dim;
    }

    public setPlot(plot: Plot) {
        this.plot = plot;
    }

    public register(root: HtmlChartElement, width: number, height: number): void {
        this.container = root.append('rect');
        this.container.attr('fill', 'transparent');

        const offset = 10;
        const axisSize = 150;

        WebClient.Instance.modelChanges$
            .pipe(takeWhile(() => !!this.container), filter(c => c.includes('isVoiceActive')))
            .subscribe(() => {
                if (WebClient.Instance.isVoiceActive) {
                    this.finalizeFilter();
                }
            });

        if (this.mode === 's') {
            if (this.type === 'x') {
                this.container.attr('width', `${width + 2 * offset}px`);
                this.container.attr('height', `${axisSize}px`);
                this.container.attr('transform', `translate(-10, ${height})`);
            } else {
                this.container.attr('height', `${height + 2 * offset}px`);
                this.container.attr('width', `${axisSize}px`);
                this.container.attr('transform', `translate(-${axisSize}, -${offset})`);
            }
        } else {
            this.container.attr('height', `${height + 2 * offset}px`);
            this.container.attr('width', `${axisSize}px`);

            if (this.mode === 'll') {
                this.container.attr('transform', `translate(-${axisSize}, -${offset})`);
            } else {
                this.container.attr('transform', `translate(${width}, -${offset})`);
            }
        }

        this.width = width;
        this.height = height;

        this.elementPosition = this.container.node().getBoundingClientRect();
        const hammerElement = new Hammer(this.container.node());

        hammerElement.get('pan').set({ direction: Hammer.DIRECTION_ALL });

        hammerElement.on('panstart', event => this.createFilter(event));
        hammerElement.on('panmove', event => this.updateFilter(event));
        hammerElement.on('panend', event => this.finalizeFilter());

        hammerElement.on('tap', event => this.handleClick(event));
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

        this.activeFilter = this.filterService.create(this.plot, this.type);
        const pointerPos = event.center;
        const relativePos = this.getRelativePosition([pointerPos.x - event.deltaX, pointerPos.y - event.deltaY]);
        if (this.type === 'x') {
            this.startPos = relativePos[0];
        } else {
            this.startPos = relativePos[1];
        }

        this.activeFilter.setFullPath(this.getFullPath(this.startPos, this.startPos + 0.01));
    }

    private updateFilter(event: HammerInput): void {
        if (this.activeFilter) {
            const pointerPos = event.center;
            const relativePos = this.getRelativePosition([pointerPos.x, pointerPos.y]);
            const currPos = this.type === 'x' ? relativePos[0] : relativePos[1];
            this.activeFilter.setFullPath(this.getFullPath(this.startPos, currPos));
        }
    }

    private finalizeFilter(): void {
        if (this.activeFilter) {
            this.filterService.finalizeFilter(this.activeFilter);
            this.activeFilter = null;
        }
    }


    private handleClick(event: HammerInput): void {
        if (!this.plot) {
            return;
        }
        const pointerPos = event.center;
        const relativePos = this.getRelativePosition([pointerPos.x, pointerPos.y]);
        const axisPos = this.type === 'x' ? relativePos[0] : relativePos[1];

        // search if user clicked on existing filter
        const filterHit: Point = this.type === 'x' ? [axisPos, 0.000001] : [0.000001, axisPos];
        for (const f of this.filterService.filters) {
            if (f.origin === this.plot.id && f.path.length === 4 && PointUtils.isInRectangle(filterHit, [
                [f.minX, f.minY],
                [f.maxX, f.maxY]
            ])) {
                this.onClickStream.next({ pos: relativePos, filter: f });
                return;
            }

            // also check for 'xy' filters if we're in ParallelCoordinates view
            if (this.mode === 'll' || this.mode === 'lr') {
                if (f.origin === this.plot.id && PointUtils.isInRectangle(filterHit, [
                    [0, f.minY],
                    [1, f.maxY]
                ])) {
                    this.onClickStream.next({ pos: relativePos, filter: f });
                    return;
                }
            }
        }

        if (this.dimension) {
            let nearestTickDistance = 1;
            let nearestTickIndex = -1;

            for (let i = 0; i < this.dimension.ticks.length; i++) {
                const tickPos = i / Math.max(1, this.dimension.ticks.length - 1);
                const tickDistance = Math.abs(axisPos - tickPos);
                if (tickDistance < nearestTickDistance) {
                    nearestTickDistance = tickDistance;
                    nearestTickIndex = i;
                }
            }

            if (nearestTickIndex >= 0 && this.dimension.ticks[nearestTickIndex].name) {
                const width = 1 / Math.max(1, this.dimension.ticks.length - 1);
                const pos = nearestTickIndex / Math.max(1, this.dimension.ticks.length - 1);
                const path = this.getFullPath(pos - width / 2, pos + width / 2);

                const existingFilter = _.find(this.filterService.filters, f =>
                    f.origin === this.plot.id && _.isEqual(f.path, path));

                if (existingFilter) {
                    this.onClickStream.next({ pos: relativePos, filter: existingFilter });
                } else {
                    const f = this.filterService.create(this.plot, this.type);
                    f.setFullPath(path);
                    this.filterService.finalizeFilter(f);
                }
            }
        }
    }

    private getFullPath(from: number, to: number): [number, number][] {

        // slightly above / below to include *everything*
        const min = -0.01;
        const max = 1.01;

        if (this.type === 'x') {
            const left = Math.min(from, to);
            const right = Math.max(from, to);
            return [
                [Math.max(min, left), min],
                [Math.max(min, left), max],
                [Math.min(max, right), max],
                [Math.min(max, right), min]
            ];

        } else {
            const top = Math.max(from, to);
            const bottom = Math.min(from, to);
            return [
                [min, Math.max(min, bottom)],
                [max, Math.max(min, bottom)],
                [max, Math.min(max, top)],
                [min, Math.min(max, top)]
            ];
        }
    }

    private getRelativePosition(pos: Point): Point {
        let relativePosX = 0;
        if (this.invertX) {
            relativePosX = 1 - (pos[0] - this.elementPosition.x) / this.elementPosition.width;
        } else {
            relativePosX = (pos[0] - this.elementPosition.x) / this.elementPosition.width;
        }

        let relativePosY = 0;
        if (this.invertY) {
            relativePosY = (pos[1] - this.elementPosition.y) / this.elementPosition.height;
        } else {
            relativePosY = 1 - ((pos[1] - this.elementPosition.y) / this.elementPosition.height);
        }

        return [relativePosX, relativePosY];
    }
}

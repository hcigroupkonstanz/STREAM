import * as d3 from 'd3';
import * as _ from 'lodash';
import { Subscription, merge } from 'rxjs';
import { HtmlChartElement, ChartElement, ChartDirective } from '@stream/directives';
import { WebClient, Filter } from '@stream/models';
import { filter as rxfilter } from 'rxjs/operators';

// documentation: https://riccardoscalco.github.io/textures/
declare var textures: any;

const DEFAULT_FILTER_COLOR = '#FF0000';

export class PathSelection extends ChartElement {

    // for showing debug bounding box
    private boxElement: HtmlChartElement;

    private defs: d3.Selection<SVGDefsElement, {}, null, undefined>;
    private hasGradient = false;
    private pathElement: HtmlChartElement;
    private line: d3.Line<number[]>;
    private filterSubPath: Subscription;
    private filterSubColor: Subscription;

    private prevTextureDef: HTMLElement = null;

    private gradientId: string;

    public constructor(
        public filter: Filter,
        private parent: ChartDirective,
        private path: string,
        private mode: 'll' | 'lr' | 's', // linkLeft - linkRight - scatterplot
        private invertX?: boolean
    ) {
        super();
        this.gradientId = this.generateId();
    }

    public register(root: HtmlChartElement, width: number, height: number): void {

        if (this.parent.svgElement.select('defs').nodes().length === 0) {
            this.defs = this.parent.svgElement.insert('defs');
        } else {
            this.defs = this.parent.svgElement.select('defs');
        }


        this.filterSubPath = merge(
            this.filter.remoteModelChanges$
                .pipe(rxfilter(changes => _.includes(changes, 'path'))),
            this.filter.path$)
            .subscribe(() => {
                this.setFilterPath(this.filter);
                this.setColor();
                this.setBoundingBox();
            });

        this.filterSubColor = this.filter.modelChanges$
            .pipe(rxfilter(changes => _.includes(changes, 'color') || _.includes(changes, 'selectedBy')))
            .subscribe(() => this.setColor());

        // for debugging
        // this.boxElement = root.append('path')
        //     .attr('class', 'line');

        this.pathElement = root.append('path')
            .attr('fill-opacity', 0.8)
            .attr('class', 'line');

        const domainX = this.invertX ? [1, 0] : [0, 1];

        let scaleX = d3.scaleLinear().domain(domainX).range([0, width]);
        if (this.mode === 'll' || this.mode === 'lr') {
            const filterWidth = 50;
            if (this.mode === 'll') {
                scaleX = d3.scaleLinear().domain(domainX).range([-filterWidth, 0]);
            }
            if (this.mode === 'lr') {
                scaleX = d3.scaleLinear().domain(domainX).range([width, width + filterWidth]);
            }
        }

        if (this.filter.boundAxis === 'y' && this.mode === 's') {
            scaleX = d3.scaleLinear().domain(domainX).range([-50, width]);
        }

        let scaleY = d3.scaleLinear().domain([0, 1]).range([height, 0]);
        if (this.filter.boundAxis === 'x' && this.mode === 's') {
            scaleY = d3.scaleLinear().domain([0, 1]).range([height + 50, 0]);
        }

        this.line = d3.line()
            .curve(d3.curveLinearClosed)
            .x(d => scaleX(d[0]))
            .y(d => scaleY(d[1]));


        this.setFilterPath(this.filter);
        this.setColor();
        this.setBoundingBox();
    }

    public unregister(): void {
        if (this.pathElement) {
            this.pathElement.remove();
        }

        // for debugging
        // this.boxElement.remove();
        this.clearGradient();

        if (this.filterSubPath) {
            this.filterSubPath.unsubscribe();
            this.filterSubPath = null;
        }

        if (this.filterSubColor) {
            this.filterSubColor.unsubscribe();
            this.filterSubColor = null;
        }
    }

    private setFilterPath(filter: Filter) {
        if ((this.filter.boundAxis === 'xy' || this.filter.boundAxis === 'x') && (this.mode === 'll' || this.mode === 'lr')) {
            const top = this.filter.maxY;
            const bottom = this.filter.minY;
            this.setPath([
                [0, Math.max(0, bottom)],
                [1, Math.max(0, bottom)],
                [1, Math.min(1, top)],
                [0, Math.min(1, top)]
            ]);
        } else {
            this.setPath(this.filter.path);
        }

    }

    private setPath(path: number[][]): void {
        this.pathElement.attr('d', this.line(path));
    }

    private setBoundingBox(): void {
        // this.boxElement.attr('d', this.line([
        //     [this.filter.minX, this.filter.minY],
        //     [this.filter.minX, this.filter.maxY],
        //     [this.filter.maxX, this.filter.maxY],
        //     [this.filter.maxX, this.filter.minY]
        // ]));
        // this.boxElement
        //     .attr('stroke', '#000000')
        //     .attr('fill', '#0000FF');
    }

    private setColor(): void {

    if (this.prevTextureDef != null) {
            this.prevTextureDef.remove();
            this.prevTextureDef = null;
        }


        let stroke = '#FF0000';
        let fill = stroke;

        if (this.filter.color && this.filter.color.startsWith('g')) {
            this.clearGradient();

            this.hasGradient = true;

            const gradient = this.defs
                .append('linearGradient')
                .attr('id', this.gradientId)
                // TODO: horizontal / vertical gradients
                .attr('x1', '0%')
                .attr('x2', '0%')
                .attr('y1', '0%')
                .attr('y2', '100%');


            const gradientStops = this.filter.color.split(':').slice(1);

            for (let i = 0; i < gradientStops.length; i++) {
                gradient.append('stop')
                    .attr('offset', `${Math.round(i / (gradientStops.length - 1) * 100)}%`)
                    .attr('stop-color', gradientStops[i]);
            }

            fill = stroke = `url(${this.path}#${this.gradientId})`;


        } else {
           fill = stroke = this.filter.color || DEFAULT_FILTER_COLOR;
        }


        if (_.includes(this.filter.selectedBy, WebClient.Instance.id)) {
            const texture = textures.lines().heavier().thicker().stroke(stroke);
            this.parent.svgElement.call(texture);
            fill = this.getAbsoluteTextureUrl(texture.url());
            this.setPrevTexture(texture.url());
        }


        this.pathElement
            .attr('stroke', stroke)
            .attr('fill', fill);
    }

    private clearGradient() {
        if (this.hasGradient) {
            this.defs.select(`[id="${this.gradientId}"]`).remove();
            this.hasGradient = false;
        }
    }

    // see: https://stackoverflow.com/a/2117523/4090817
    private generateId() {
        return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
            // tslint:disable-next-line:no-bitwise
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    private setPrevTexture(url: string): void {
        const id = url.replace('url(#', '').replace(')', '');
        const texture = document.getElementById(id);
        if (texture) {
            this.prevTextureDef = texture.parentElement;
        }
    }

    // Texture.js returns relative url as 'url(#xyz)',
    // but Edge/Firefox need absolute url: 'url(localhost#324)'
    private getAbsoluteTextureUrl(url: string) {
        return url.replace('url(', 'url(' + this.path);
    }
}

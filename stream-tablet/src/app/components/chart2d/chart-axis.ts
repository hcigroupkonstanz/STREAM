import * as d3 from 'd3';
import * as _ from 'lodash';
import { HtmlChartElement, ChartElement } from '@stream/directives';
import { DataDimension } from '@stream/models';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';

export class ChartAxis extends ChartElement {

    private svgElement: HtmlChartElement;
    private width: number;
    private height: number;
    private axis: d3.Axis<any>;
    private registered = new BehaviorSubject<boolean>(false);
    private invertX = false;

    private dim: DataDimension = null;
    private specificData: [number, number, number][] = null;

    public constructor(private type: 'x' | 'y') {
        super();
    }

    public register(root: HtmlChartElement, width: number, height: number): void {
        this.svgElement = root.append('g');
        this.width = width;
        this.height = height;
        this.setScale();
        this.registered.next(true);
    }

    public unregister(): void {
        this.svgElement.remove();
        this.registered.next(false);
    }

    public async getElement() {
        await this.registered.pipe(first(x => x)).toPromise();
        return this.svgElement.node();
    }

    private setScale(): void {
        const range = this.type === 'x' ? [0, this.width] : [this.height, 0];
        const domain = (this.invertX && this.type === 'x') ? [1, 0] : [0, 1];
        const scale = d3.scaleLinear().range(range).domain(domain);

        if (this.type === 'x') {
            this.axis = d3.axisBottom(scale);
        } else {
            this.axis = d3.axisLeft(scale);
        }

        this.updateScale();
    }

    private updateScale(): void {
        if (this.type === 'x') {
            this.svgElement
                .attr('transform', 'translate(0, ' + this.height + ')')
                .call(this.axis);
        } else {
            this.svgElement
                .call(this.axis);
        }

        this.svgElement
            .attr('class', 'axis')
            .selectAll('text')
                .attr('font-size', '15px')
                .attr('font-family', 'Roboto, "Helvetica Neue", sans-serif')
                .call(this.wrap, 160, this.type);

        if (this.type === 'x') {
            this.svgElement.selectAll('text')
                .style('text-anchor', 'end')
                .attr('transform', 'rotate(-45)');
        }

    }


    public showSpecificData(data: [number, number, number][]): void {
        this.specificData = data;
        this.setDimension(this.dim);
    }

    public showAll(): void {
        this.specificData = null;
        this.setDimension(this.dim);
    }

    public setDimension(dim: DataDimension): void {
        this.dim = dim;
        if (this.axis) {
            if (dim) {
                if (!this.specificData) {
                    this.axis
                        .tickValues(_.map(dim.ticks, t => t.value))
                        .tickFormat((t, i) => dim.ticks[i].name);
                } else {

                    const tickFormats = {};
                    for (const d of this.specificData) {
                        const val = this.type === 'x' ? d[1] : d[2];
                        const id = this.dim.rawValues[d[0]];
                        tickFormats[val] = id;
                    }

                    this.axis
                        .tickValues(_(this.specificData)
                            .map(d => this.type === 'x' ? d[1] : d[2])
                            .uniq()
                            .value())
                        .tickFormat((t, i) => tickFormats[t] || 'null');
                }
            } else {
                this.axis
                    .tickValues([])
                    .tickFormat((t, i) => '');
            }
        }

        this.updateScale();
    }

    public setInvertX(inverted) {
        this.invertX = inverted;
        this.setScale();
    }


    // see: https://bl.ocks.org/mbostock/7555321
    private wrap(text, width, axis) {
        text.each(function() {
            const dtext = d3.select(this);
            const words = dtext.text().trim().split(/\s+/).reverse();
            let word;
            let line = [];
            let lineNumber = 0;
            const lineHeight = 0.9; // ems
            const y = dtext.attr('y');
            const dy = parseFloat(dtext.attr('dy')) + (axis === 'x' ? 0.5 : 0);
            const dx = axis === 'x' ? -0.8 : -1;
            let tspan = dtext.text(null).append('tspan')
                .attr('x', dx + 'em')
                .attr('y', y)
                .attr('dx', 0)
                .attr('dy', dy + 'em');

            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(' '));
                if ((<any>tspan.node()).getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(' '));
                    line = [word];
                    tspan = dtext.append('tspan')
                        .attr('x', dx + 'em')
                        .attr('y', y)
                        .attr('dy', ++lineNumber * lineHeight + dy + 'em')
                        .attr('dx', '0em')
                        .text(word);
                }
            }
        });
    }

}

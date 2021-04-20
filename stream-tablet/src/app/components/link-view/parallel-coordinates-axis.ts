import * as d3 from 'd3';
import * as _ from 'lodash';
import { ChartElement, HtmlChartElement } from '@stream/directives';
import { DataDimension } from '@stream/models';
import { first } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

export class ParallelCoordinatesAxis extends ChartElement {

    private svgElement: HtmlChartElement;
    private width: number;
    private height: number;
    private axis: d3.Axis<any>;
    private registered = new BehaviorSubject<boolean>(false);

    public constructor(private type: 'left' | 'right') {
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
        const range = [this.height, 0];
        const domain = [0, 1];
        const scale = d3.scaleLinear().range(range).domain(domain);

        if (this.type === 'left') {
            this.axis = d3.axisLeft(scale);
        } else {
            this.axis = d3.axisRight(scale);
        }

        this.updateScale();
    }

    private updateScale(): void {
        if (this.type === 'left') {
            this.svgElement
                .call(this.axis);
        } else {
            this.svgElement
                .attr('transform', `translate(${this.width}, 0)`)
                .call(this.axis);
        }

        this.svgElement
            .attr('class', 'axis')
            .selectAll('text')
                .attr('font-size', '15px')
                .call(this.wrap, 160, this.type);
    }

    public setDimension(dim: DataDimension): void {
        if (this.axis && dim) {
            this.axis
                .tickValues(_.map(dim.ticks, t => t.value))
                .tickFormat((t, i) => dim.ticks[i].name);
        }

        this.updateScale();
    }


    // see: https://bl.ocks.org/mbostock/7555321
    private wrap(text, width, axis) {
        text.each(function() {
            const dtext = d3.select(this);
            const words = dtext.text().trim().split(/\s+/).reverse();
            let word: string;
            let line = [];
            let lineNumber = 0;
            const lineHeight = 1.1; // ems
            const y = dtext.attr('y');
            const dy = parseFloat(dtext.attr('dy'));
            const dx = axis === 'left' ? -1 : 1;
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
                        .attr('dx', 0)
                        .text(word);
                }
            }
        });
    }


}

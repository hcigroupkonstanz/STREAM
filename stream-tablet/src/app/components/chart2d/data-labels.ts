import { Plot } from '@stream/models';
import * as d3 from 'd3';
import * as _ from 'lodash';
import { HtmlChartElement, ChartElement } from '@stream/directives';

type Scale = d3.ScaleContinuousNumeric<number, number>;

export class DataLabels extends ChartElement {

    private dataContainer: HtmlChartElement;
    private dataCount = -1;

    public register(root: d3.Selection<any, {}, null, undefined>, width: number, height: number): void {
        this.dataContainer = root.append('g');
    }


    public unregister(): void {
        this.dataContainer.remove();
    }


    public loadData(plot: Plot, scaleX: Scale, scaleY: Scale) {
        const lineData: number[][][] = [];
        for (const d of plot.data) {
            // each line has three points
            lineData.push([d, d, d]);
        }

        const lineFn = d3.line<number[]>()
            .x((d, i) => i === 0 ? 0 : scaleX(d[1]))
            .y((d, i) => i === 2 ? scaleY(0) : scaleY(d[2]));

        if (this.dataCount < 0 || this.dataCount !== plot.data.length) {
            this.clear();
            this.setData(lineData, lineFn);
            this.dataCount = plot.data.length;
        } else {
            this.animateValues(lineData, lineFn);
        }
    }

    private animateValues(data: number[][][], line: d3.Line<number[]>): void {
        this.dataContainer.selectAll('path')
            .data(data)
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr('d', line);
    }


    private setData(data: number[][][], line: d3.Line<number[]>): void {
        this.dataContainer.selectAll('.dataLine')
            .data(data)
            .enter().append('path')
                .attr('class', 'dataLine')
                .attr('d', line);
    }


    public clear() {
        this.dataContainer.selectAll('path').remove();
        this.dataCount = -1;
    }
}

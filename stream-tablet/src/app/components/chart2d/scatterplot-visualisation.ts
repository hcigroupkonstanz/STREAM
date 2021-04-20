import { Plot, ColorTable } from '@stream/models';
import { HtmlChartElement, ChartElement } from '@stream/directives';

import * as _ from 'lodash';
import * as d3 from 'd3';

type Scale = d3.ScaleContinuousNumeric<number, number>;

const DATA_SIZE = 10;

export class ScatterplotVisualisation extends ChartElement {

    private dataContainer: HtmlChartElement;
    private dataCount = -1;

    public register(root: HtmlChartElement, width: number, height: number): void {
        this.dataContainer = root.append('g');
    }

    public unregister(): void {
        this.dataContainer.remove();
    }

    public loadData(plot: Plot, colorTable: ColorTable, scaleX: Scale, scaleY: Scale): void {
        if (this.dataCount < 0 || this.dataCount !== plot.data.length) {
            this.clearData();
            this.initValues(plot.data, colorTable, scaleX, scaleY);
            this.dataCount = plot.data.length;
        } else {
            this.animateValues(plot.data, colorTable, scaleX, scaleY);
        }
    }


    public clearData(): void {
        this.dataContainer.selectAll('rect').remove();
        this.dataCount = -1;
    }

    private initValues(data: number[][], colorTable: ColorTable, scaleX: Scale, scaleY: Scale): void {
        this.dataContainer.selectAll('.point')
            .data(data)
            .enter().append('rect')
                .attr('x', d => scaleX(d[1]) - DATA_SIZE / 2)
                .attr('y', d => scaleY(d[2]) - DATA_SIZE / 2)
                .attr('width', DATA_SIZE)
                .attr('height', DATA_SIZE)
                .attr('class', 'point')
                .attr('fill', d => colorTable.htmlColors[d[0]]);
    }

    private animateValues(data: number[][], colorTable: ColorTable, scaleX: Scale, scaleY: Scale): void {
        this.dataContainer.selectAll('rect')
            .data(data)
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr('x', d => scaleX(d[1]) - DATA_SIZE / 2)
            .attr('y', d => scaleY(d[2]) - DATA_SIZE / 2)
            .attr('fill', d => colorTable.htmlColors[d[0]]);
    }

    public setAttributes(attributes: any[]): void {
        this.dataContainer.selectAll('rect')
            .attr('fill', (d, i) => attributes[i].fill)
            .attr('stroke', (d, i) => attributes[i].stroke)
            .attr('width', (d, i) => attributes[i].radius)
            .attr('height', (d, i) => attributes[i].radius);
    }
}

import { HtmlChartElement, ChartElement } from '@stream/directives';

import * as _ from 'lodash';
import * as d3 from 'd3';
import { ColorTable } from '@stream/root/models';

type Scale = d3.ScaleContinuousNumeric<number, number>;

export class ParallelCoordinatesVisualisation extends ChartElement {

    private dataContainer: HtmlChartElement;
    private dataCount = -1;

    private width = 0;
    private currData: [number, number, number, boolean][] = [];
    private colors: ColorTable;

    private line: d3.Line<[number, number]>;

    public constructor() {
        super();
    }

    public register(root: HtmlChartElement, width: number, height: number): void {
        this.dataContainer = root.append('g');
        this.width = width;
    }

    public unregister(): void {
        this.dataContainer.remove();
    }

    public updateColors(colors: ColorTable) {
        this.colors = colors;
        this.setColor();
    }

    public loadData(dataLeft: number[][], dataRight: number[][], scaleLeft: Scale, scaleRight: Scale, type: 'x' | 'y', forceInit = false) {
        const data: [number, number, number, boolean][] = [];
        const dataIndex = type === 'x' ? 1 : 2;
        // TODO: aggregations
        let j = 0;
        for (let i = 0; i < dataLeft.length; i++) {

            while ((j + 1) < dataRight.length && dataRight[j][0] < dataLeft[i][0]) {
                j++;
            }

            if (dataLeft[i][0] === dataRight[j][0]) {
                data.push([dataLeft[i][dataIndex], dataRight[j][dataIndex], dataLeft[i][0],
                    dataLeft[i][1] === null || dataLeft[i][2] === null || dataRight[j][1] === null || dataRight[j][2] === null]);
            }
        }

        if (this.dataCount < 0 || this.dataCount !== data.length || forceInit) {
            this.clearData();
            this.initValues(data, scaleLeft, scaleRight);
            this.dataCount = data.length;
        } else {
            this.animateValues(data, scaleLeft, scaleRight);
        }

        this.currData = data;
    }

    private setColor(): void {
        if (!this.line) {
            return;
        }

        this.dataContainer.selectAll('path')
            .data(this.currData)
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr('stroke', d => this.colors ? this.colors.htmlColors[d[2]] : '#000000')
            .attr('stroke-opacity', d => this.colors ? (this.colors.colors[d[2]][3] / 255) : 0)
            .attr('stroke-width', d => (this.colors && this.colors.colors[d[2]][3] > 250) ? '3px' : '1px')
            .attr('d', d => this.line([[0, d[0]], [1, d[1]]]));
    }

    public clearData(): void {
        this.dataContainer.selectAll('path').remove();
        this.dataCount = -1;
    }

    private initValues(data: [number, number, number, boolean][], scaleLeft: Scale, scaleRight: Scale): void {
        this.line = d3.line()
            .x(([key, value]) => key * this.width || 0)
            .y(([key, value]) => (!key ? scaleLeft(value) : scaleRight(value)) || 0);

        this.dataContainer
            .selectAll('path')
            .data(data)
            .enter().append('path')
                .attr('d', d => this.line([[0, d[0] || 0], [1, d[1] || 0]]))
                .style('stroke-dasharray', d => d[3] ? '10' : '0')
                .attr('stroke', d => this.colors ? this.colors.htmlColors[d[2]] : '#000000')
                .attr('stroke-opacity', d => this.colors ? (this.colors.colors[d[2]][3] / 255) : 0)
                .attr('stroke-width', d => (this.colors && this.colors.colors[d[2]][3] > 250) ? '3px' : '1px')
                .attr('class', 'pcline');
    }

    private animateValues(data: [number, number, number, boolean][], scaleLeft: Scale, scaleRight: Scale): void {
        this.line = d3.line()
            .defined(d => !isNaN(d[1]))
            .x(([key, value]) => key * this.width)
            .y(([key, value]) => key === 0 ? scaleLeft(value) : scaleRight(value));

        this.dataContainer.selectAll('path')
            .data(data)
            .style('stroke-dasharray', d => d[3] ? '10' : '0')
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr('stroke', d => this.colors ? this.colors.htmlColors[d[2]] : '#000000')
            .attr('stroke-opacity', d => this.colors ? (this.colors.colors[d[2]][3] / 255) : 0)
            .attr('stroke-width', d => (this.colors && this.colors.colors[d[2]][3] > 250) ? '3px' : '1px')
            .attr('d', d => this.line([[0, d[0] || 0], [1, d[1] || 0]]));
    }
}

import { Directive, OnInit, OnChanges, SimpleChanges, ElementRef, Input, OnDestroy } from '@angular/core';
import { } from '@stream/models';

import * as d3 from 'd3';
import * as _ from 'lodash';

import { ChartElement } from './chart-element';
import { HtmlChartElement } from './html-chart-element';

@Directive({
    selector: '[appChart]'
})
export class ChartDirective implements OnInit, OnChanges, OnDestroy {

    @Input() width = 600;
    @Input() height = 600;
    @Input() actualHeight = '100%';
    @Input() actualWidth = '100%';
    @Input() margin = { top: 10, right: 10, bottom: 10, left: 10 };

    public svgElement: HtmlChartElement;
    private chartContainer: HtmlChartElement;
    private backgroundContainer: HtmlChartElement;
    private foregroundContainer: HtmlChartElement;
    private chartElements: ChartElement[] = [];

    constructor(private elementRef: ElementRef) { }

    ngOnInit(): void {
        this.initialize();
    }

    ngOnChanges(changes: SimpleChanges): void {

    }

    ngOnDestroy(): void {
        for (const element of this.chartElements) {
            element.unregister();
        }
    }

    public addBackgroundElement(element: ChartElement): void {
        element.register(this.backgroundContainer, this.width, this.height);
        this.chartElements.push(element);
    }

    public addForegroundElement(element: ChartElement): void {
        element.register(this.foregroundContainer, this.width, this.height);
        this.chartElements.push(element);
    }

    public addElement(element: ChartElement): void {
        element.register(this.chartContainer, this.width, this.height);
        this.chartElements.push(element);
    }

    public removeElement(element: ChartElement): void {
        _.pull(this.chartElements, element);
        element.unregister();
    }


    private getTotalSize() {
        return {
            width: this.width + this.margin.left + this.margin.right,
            height: this.height + this.margin.top + this.margin.bottom
        };
    }

    private initialize(): void {
        const d3element = d3.select(this.elementRef.nativeElement);
        d3element.html('');

        const totalSize = this.getTotalSize();
        this.svgElement = d3element.append('svg')
            .attr('width', this.actualWidth)
            .attr('height', this.actualHeight)
            .attr('viewBox', `0 0 ${totalSize.width} ${totalSize.height}`)
            .attr('shape-rendering', 'geometricPrecision')
            .attr('preserveAspectRatio', 'xMinYMin meet');

        this.backgroundContainer = this.svgElement
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
        this.chartContainer = this.svgElement
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
        this.foregroundContainer = this.svgElement
            .append('g')
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
    }

}

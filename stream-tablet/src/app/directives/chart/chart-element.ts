import { HtmlChartElement } from './html-chart-element';

export abstract class ChartElement {
    public abstract register(root: HtmlChartElement, width: number, height: number): void;
    public abstract unregister(): void;
}

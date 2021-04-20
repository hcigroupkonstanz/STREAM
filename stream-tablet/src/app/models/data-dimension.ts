export interface DataDimension {
    column: string;
    displayName: string;
    ticks: { name: string, value: number }[];
    hideTicks: boolean;
    maxAggregation: number;
    rawValues: any[];
}

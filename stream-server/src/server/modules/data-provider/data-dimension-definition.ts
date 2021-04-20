export type DataDimensionDefinition = MetricDataDimensionDefinition | CategoricalDataDimensionDefinition | TimeDataDimensionDefinition;

interface BaseDataDimensionDefinition {
    column: string;
    displayName: string;
    hideTicks?: boolean;
    ticks?: { name: string, value: number }[];
    treatZeroAsNull?: boolean;
}

export interface MetricDataDimensionDefinition extends BaseDataDimensionDefinition {
    type: 'metric';
    min?: number;
    max?: number;
}

export interface CategoricalDataDimensionDefinition extends BaseDataDimensionDefinition {
    type: 'categorical';
    mappingFn?: (val: string) => number;
    mapping?: { [key: string]: number };
}

export interface TimeDataDimensionDefinition extends BaseDataDimensionDefinition {
    type: 'time';
    format: string;
}

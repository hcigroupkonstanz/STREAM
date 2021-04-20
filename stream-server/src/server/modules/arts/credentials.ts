import { MssqlConfig, CsvConfig, DataDimensionDefinition, AggregationDefinition } from '../';

export type Credentials = (SqlCredentials | CsvCredentials | DebugCredentials);

interface CommonCredentials {
    dimensions: DataDimensionDefinition[];
    aggregations: AggregationDefinition[];
}

export interface SqlCredentials extends CommonCredentials {
    type: 'sql';
    options: MssqlConfig;
}

export interface CsvCredentials extends CommonCredentials {
    type: 'csv';
    options: CsvConfig;
}

export interface DebugCredentials extends CommonCredentials {
    type: 'debug';
}

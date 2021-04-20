import { AggregationDefinition } from './aggregation-definition';
import { DataProvider } from './data-provider';
import { Database } from '../database';
import { DataDimensionDefinition } from './data-dimension-definition';

export class SqlDataProvider extends DataProvider {
    public get serviceName(): string { return `SqlProvider-${this.db.serviceName}`; }
    public get groupName(): string { return 'data'; }

    public constructor(private db: Database, dimensions: DataDimensionDefinition[], aggregations: AggregationDefinition[]) {
        super(dimensions, aggregations);
    }

    public init(): void {

    }
}

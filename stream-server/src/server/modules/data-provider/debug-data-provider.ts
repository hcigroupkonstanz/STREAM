import { AggregationDefinition } from './aggregation-definition';
import { Observable, Subject } from 'rxjs';
import { DataProvider } from './data-provider';
import { DataDimensionDefinition } from './data-dimension-definition';

export class DebugDataProvider extends DataProvider {
    public get serviceName(): string { return 'DebugData'; }
    public get groupName(): string { return 'data'; }

    public constructor(dimensions: DataDimensionDefinition[], aggregations: AggregationDefinition[]) {
        super(dimensions, aggregations);
        this.logInfo('Debug data provider initialised');
        this.initialized.next(true);
    }
}

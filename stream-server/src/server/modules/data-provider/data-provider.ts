import * as _ from 'lodash';
import { AggregationDefinition } from './aggregation-definition';
import { Observable, BehaviorSubject } from 'rxjs';
import { Service } from '../core';
import { first } from 'rxjs/operators';
import { DataDimension } from './data-dimension';
import { DataDimensionDefinition } from './data-dimension-definition';

export abstract class DataProvider extends Service {

    private readonly _dimensions: DataDimension[] = [];
    public get dimensions(): ReadonlyArray<DataDimension> {
        return this._dimensions;
    }

    public get aggregations(): ReadonlyArray<AggregationDefinition> {
        return this.aggregationDefinitions;
    }

    private readonly _rawData: any[] = [];
    public get rawData(): ReadonlyArray<any> {
        return this._rawData;
    }

    protected readonly initialized = new BehaviorSubject<boolean>(false);
    public get initialized$(): Observable<boolean> {
        return this.initialized.pipe(first(isInit => isInit));
    }


    public constructor(
        dimensionDefinitions: DataDimensionDefinition[],
        private aggregationDefinitions: AggregationDefinition[]) {
        super();
        this.initialize(dimensionDefinitions, aggregationDefinitions);
    }

    private async initialize(dimensionDefinitions: DataDimensionDefinition[], aggregations: AggregationDefinition[]) {
        await this.initialized$.toPromise();

        for (const definition of dimensionDefinitions) {
            this._dimensions.push(new DataDimension(definition, this._rawData));
        }

        for (const aggregation of aggregations) {
            for (const dim of this._dimensions) {
                if (aggregation.include) {
                    if (_.includes(aggregation.include, dim.column)) {
                        dim.maxAggregation = Math.max(dim.maxAggregation, aggregation.level);
                    }
                } else {
                    if (!_.includes(aggregation.exclude, dim.column)) {
                        dim.maxAggregation = Math.max(dim.maxAggregation, aggregation.level);
                    }
                }
            }
        }
    }

    protected addData(data: any): void {
        this._rawData.push(data);
    }
}

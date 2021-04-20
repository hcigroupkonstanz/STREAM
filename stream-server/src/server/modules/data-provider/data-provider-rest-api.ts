import * as _ from 'lodash';
import { Router } from 'express';
import { Service, WebServer } from '../core';
import { DataProvider } from './data-provider';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export class DataProviderRestApi extends Service {
    public get serviceName(): string { return 'DataRestApi'; }
    public get groupName(): string { return 'web'; }

    public constructor(
        webServer: WebServer,
        dataProvider: Subject<DataProvider>) {
        super();

        let dimensions: ReadonlyArray<any> = [];
        let aggregations: ReadonlyArray<any> = [];

        dataProvider.pipe(filter(p => p !== null)).subscribe(async provider => {
            await provider.initialized$.toPromise();
            dimensions = _.map(provider.dimensions, d => d.toJson());
            aggregations = provider.aggregations;
        });

        webServer.addApi('/data', Router()
            .get('/', (req, res, next) => {
                res.json(dimensions);
            }));

        webServer.addApi('/aggregations', Router()
            .get('/', (req, res, next) => {
                res.json(aggregations);
            }));
    }
}

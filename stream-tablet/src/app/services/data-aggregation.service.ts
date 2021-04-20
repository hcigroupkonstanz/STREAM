import * as _ from 'lodash';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SocketIO } from './socket-io.service';
import { Logger } from './logger.service';
import { DataAggregation } from '@stream/models';

@Injectable({
    providedIn: 'root'
})
export class DataAggregationService {

    public readonly aggregations: DataAggregation[] = [];
    private initialized: Promise<void>;

    constructor(
        private http: HttpClient,
        private socketIO: SocketIO,
        private logger: Logger
    ) {
        this.initialize();

        // for debugging
        window['aggregations'] = this.aggregations;
    }

    private async initialize() {
        this.initialized = new Promise(async (resolve, reject) => {
            try {
                const result = await this.http.get<DataAggregation[]>('/api/aggregations/').toPromise();
                for (const aggregation of result) {
                    this.aggregations.push(aggregation);
                }
            } catch (e) {
                this.logger.error(e.message);
            }

            resolve();
        });
    }
}

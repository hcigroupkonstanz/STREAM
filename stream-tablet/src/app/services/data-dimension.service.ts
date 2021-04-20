import * as _ from 'lodash';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { SocketIO } from './socket-io.service';
import { Logger } from './logger.service';
import { DataDimension, NC_DATA } from '@stream/models';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DataDimensionService {

    public readonly dimensions$: BehaviorSubject<DataDimension[]> = new BehaviorSubject([]);
    private initialized: Promise<void>;

    constructor(
        private http: HttpClient,
        private socketIO: SocketIO,
        private logger: Logger
    ) {
        this.initialize();

        socketIO.on(NC_DATA, (cmd, payload) => {
            if (cmd === 'data-reload') {
                this.dimensions$.next(payload as DataDimension[]);
            }
        });

        // for debugging
        this.dimensions$.subscribe(v => window['datadimensions'] = v);
    }

    private async initialize() {
        this.initialized = new Promise(async (resolve, reject) => {
            try {
                const result = await this.http.get<DataDimension[]>('/api/data/').toPromise();
                this.dimensions$.next(result as DataDimension[]);
            } catch (e) {
                this.logger.error(e.message);
            }

            resolve();
        });
    }

    public async getDimension(column: string): Promise<DataDimension | null> {
        await this.initialized;
        return _.find(this.dimensions$.value, dim => dim.column === column);
    }
}

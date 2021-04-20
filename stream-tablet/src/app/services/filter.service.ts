import { NC_FILTER } from './../models/network-channel';
import * as _ from 'lodash';
import { Injectable } from '@angular/core';
import { Filter, Plot, WebClient } from '@stream/models';
import { SocketIO } from './socket-io.service';
import { PlotService } from './plot.service';
import { Logger } from './logger.service';
import { RemoteService } from './remote-service';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FilterService extends RemoteService {

    public readonly filters: Filter[] = [];

    private filterCreatedStream = new Subject<Filter>();
    public get filterCreated$() { return this.filterCreatedStream.asObservable(); }

    private filterCompletedStream = new Subject<Filter>();
    public get filterCompleted$() { return this.filterCompletedStream.asObservable(); }

    private filterDeletedStream = new Subject<Filter>();
    public get filterDeleted$() { return this.filterDeletedStream.asObservable(); }


    constructor(
        private socketIO: SocketIO,
        private plots: PlotService,
        private logger: Logger
    ) {
        super();
        this.initialize();

        // for debugging
        window['filters'] = this.filters;
    }

    private async initialize() {
        await this.plots.initialized;

        this.socketIO.send(NC_FILTER, 'request', null);

        this.socketIO.on(NC_FILTER, (cmd, payload) => {
            switch (cmd) {
                case 'request':
                    while (this.filters.length > 0) {
                        const filter = this.filters.pop();
                        this.filterDeletedStream.next(filter);
                    }

                    for (const p of payload) {
                        this.addFilter(p);
                    }
                    break;

                case 'add':
                case 'update':
                    this.updateFilter(payload);
                    break;

                case 'remove':
                    this.removeFilter(payload.uuid);
                    break;

                default:
                    this.logger.error(`Unknown command ${cmd} for filters`);
                    break;
            }
        });

        this._initialized.next(true);
    }

    public create(plot: Plot, boundAxis: 'x' | 'y' | 'xy' = 'xy'): Filter {
        const filterData = {
            origin: plot.id,
            axisX: plot.dimX,
            axisY: plot.dimY,
            boundAxis: boundAxis,
            isBeingCreatedBy: WebClient.Instance.id
        };
        const filter = this.addFilter(filterData);
        filterData['uuid'] = filter.uuid;

        this.socketIO.send(NC_FILTER, 'create', filterData);

        // Filter must be available *instantaneously*,
        // once server sends back update the ID is assigned,
        return filter;
    }



    public async getFilter(uuid: string): Promise<Filter | null> {
        await this.initialized;
        return _.find(this.filters, f => f.uuid === uuid);
    }


    private addFilter(data: any): Filter {
        const filter = new Filter();
        filter.remoteUpdate(data);

        filter.localModelChanges$.subscribe(changes => {
            this.socketIO.send(NC_FILTER, 'update', filter.toJson(changes));
        });

        this.filters.push(filter);
        this.filterCreatedStream.next(filter);

        return filter;
    }


    private async updateFilter(data: any) {
        let filter = await this.getFilter(data.uuid);
        if (!filter) {
            filter = this.addFilter(data);
        } else {
            filter.remoteUpdate(data);
        }

        filter.initializedStream.next(true);
    }


    private removeFilter(uuid: string): void {
        const removed = _.remove(this.filters, f => f.uuid === uuid);
        for (const filter of removed) {
            this.filterDeletedStream.next(filter);
            filter.destroy();
        }
    }

    public remove(uuid: string): void {
        this.removeFilter(uuid);
        this.socketIO.send(NC_FILTER, 'remove', { uuid: uuid });
    }

    public async finalizeFilter(filter: Filter) {
        await filter.initialized;
        filter.isBeingCreatedBy = -1;
        this.filterCompletedStream.next(filter);
    }
}

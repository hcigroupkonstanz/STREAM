import * as _ from 'lodash';
import { SocketIOServer } from '../web-clients';
import { UnityServerProxy } from '../unity';
import { Message, Service, NC_FILTER } from '../core';
import { Manager } from '../database';
import { Plot } from '../plots';
import { Filter as PlotFilter } from './filter';
import { filter, delay } from 'rxjs/operators';
import { merge } from 'rxjs';

export class FilterListener extends Service {
    public serviceName = 'FilterListener';
    public groupName = 'data';

    public constructor(
        private filters: Manager<PlotFilter>,
        private plots: Manager<Plot>,
        private socketServer: SocketIOServer,
        private unityServer: UnityServerProxy
    ) {
        super();

        // plot dimension change -> delete all filters bound to that axis
        plots.modelChanges$
            .pipe(filter(ev => ev.changes.includes('dimX') || ev.changes.includes('dimY')))
            .subscribe(ev => {
                const plotFilters = _.filter(filters.loadedEntries, f => f.origin === ev.model.id);
                const changedX = ev.changes.includes('dimX');
                const changedY = ev.changes.includes('dimY');
                const deletedFilters: PlotFilter[] = [];

                for (const f of plotFilters) {
                    if (changedX && f.boundAxis.indexOf('x') >= 0) {
                        deletedFilters.push(f);
                    } else if (changedY && f.boundAxis.indexOf('y') >= 0) {
                        deletedFilters.push(f);
                    }
                }

                for (const f of deletedFilters) {
                    filters.delete(f.id);
                }
            });

        plots.modelChanges$
            .pipe(filter(ev => ev.changes.includes('useSort')))
            .subscribe(ev => {
                const plotFilters = _.filter(filters.loadedEntries, f => f.origin === ev.model.id);
                const deletedFilters: PlotFilter[] = [];

                for (const f of plotFilters) {
                    if (f.boundAxis.indexOf('x') >= 0) {
                        deletedFilters.push(f);
                    }
                }

                for (const f of deletedFilters) {
                    filters.delete(f.id);
                }
            });

        // filter finished creating -> check if filter contains data, if not: delete
        filters.modelChanges$
            .pipe(filter(ev => ev.changes.includes('isBeingCreatedBy')), delay(500))
            .subscribe(ev => {
                if (ev.model.includes.value.length === 0) {
                    this.filters.delete(ev.model.id);
                }
            });



        merge(unityServer.trackingMessages$, unityServer.arMessages$)
            .pipe(filter(m => m.channel === NC_FILTER))
            .subscribe(msg => {
                if (msg.command === 'request') {
                    unityServer.broadcast({
                        channel: NC_FILTER,
                        command: 'request',
                        payload: this.filters.loadedEntries.map(f => f.toJson())
                    }, [msg.origin]);
                }
            });

        socketServer.clientDisconnected$
            .subscribe(c => {
                for (const f of filters.loadedEntries) {
                    f.selectedBy = _.without(f.selectedBy, c.id);
                    if (f.isBeingCreatedBy === c.id) {
                        f.isBeingCreatedBy = -1;
                    }
                }
            });


        socketServer.messages$
            .pipe(filter(m => m.channel === NC_FILTER))
            .subscribe(msg => {
                switch (msg.command) {
                    case 'create':
                        this.filters.create(msg.payload);
                        break;

                    case 'request':
                        socketServer.send(msg.origin, {
                            channel: NC_FILTER,
                            command: 'request',
                            payload: this.filters.loadedEntries.map(f => f.toJson())
                        });
                        break;

                    case 'update':
                        this.updateFilter(msg.payload, msg.origin);
                        break;

                    case 'remove':
                        this.removeFilter(msg.payload.uuid);
                        break;

                    default:
                        this.logError(`Unknown command ${msg.command} for filters`);
                        break;
                }
            });

        plots.modelDeleted$
            .subscribe(plot => {
                const affectedFilters = _.filter(filters.loadedEntries, f => f.origin === plot.id);
                for (const affected of affectedFilters) {
                    this.removeFilter(affected.uuid);
                }
            });


        filters.modelCreated$
            .subscribe(m => {
                const msg: Message = {
                    channel: NC_FILTER,
                    command: 'add',
                    payload: m.toJson()
                };

                unityServer.broadcast(msg, unityServer.currentArClients);
                socketServer.broadcast(msg);
            });

        filters.modelDeleted$
            .subscribe(m => {
                const msg: Message = {
                    channel: NC_FILTER,
                    command: 'remove',
                    payload: { id: m.id, uuid: m.uuid }
                };

                unityServer.broadcast(msg, unityServer.currentArClients);
                socketServer.broadcast(msg);
            });


        filters.modelChanges$
            .subscribe(ev => {
                ev.changes.push('uuid');

                const msg: Message = {
                    channel: NC_FILTER,
                    command: 'update',
                    payload: ev.model.toJson(ev.changes)
                };

                unityServer.broadcast(msg, _.without(unityServer.currentArClients, ev.source));
                socketServer.broadcast(msg, _.without(socketServer.currentClients, ev.source));
            });
    }

    private async updateFilter(data: any, source: any) {
        const f = await this.filters.get({ uuid: data.uuid }, false).toPromise();

        if (f) {
            f.update(data, source);
        } else {
            this.logError(`Unable to find filter with uuid ${data.uuid}`);
        }
    }


    private async removeFilter(uuid: string) {
        const f = await this.filters.get({ uuid: uuid }, false).toPromise();

        if (f) {
            this.filters.delete(f.id);
        } else {
            this.logError(`Unable to find filter with uuid ${uuid}`);
        }
    }
}

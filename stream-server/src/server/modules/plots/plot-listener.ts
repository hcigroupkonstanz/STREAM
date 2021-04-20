import { NC_PLOT } from './../core/network-channel';
import { Message, Service } from '../core';
import { Manager } from '../database';
import { UnityServerProxy } from '../unity';
import { SocketIOServer } from '../web-clients';
import { Plot } from './plot';
import { filter } from 'rxjs/operators';

import * as _ from 'lodash';
import { merge } from 'rxjs';

export class PlotListener extends Service {
    public serviceName = 'PlotListener';
    public groupName = 'data';

    public constructor(
        private plots: Manager<Plot>,
        private socketServer: SocketIOServer,
        private unityServer: UnityServerProxy) {
        super();

        merge(unityServer.arMessages$, unityServer.trackingMessages$)
            .pipe(filter(m => m.channel === NC_PLOT))
            .subscribe(msg => {
                if (msg.command === 'update') {
                    this.updatePlot(msg.payload, msg.origin);
                } else if (msg.command === 'request') {
                    this.unityServer.broadcast({
                        channel: NC_PLOT,
                        command: 'request',
                        payload: this.plots.loadedEntries.map(p => p.toJson())
                    }, [msg.origin]);
                } else {
                    this.logWarning(`Unknown command ${msg.command} from tracking server`);
                }
            });


        // make sure to properly disconnect plots from webclients
        socketServer.clientDisconnected$
            .subscribe(c => {
                for (const plot of plots.loadedEntries) {
                    if (plot.boundTo === c.id) {
                        plot.boundTo = -1;
                        plot.lockedToAxis = false;
                    }
                }
            });

        unityServer.clientsRemoved$
            .subscribe(c => {
                for (const wc of socketServer.currentClients) {
                    if (wc.owner === c.id) {
                        for (const plot of plots.loadedEntries) {
                            if (plot.boundTo === c.id) {
                                plot.boundTo = -1;
                                plot.lockedToAxis = false;
                            }
                        }
                    }
                }
            });


        // external updates
        socketServer.messages$
            .pipe(filter(m => m.channel === NC_PLOT))
            .subscribe(async m => {
                try {
                    switch (m.command) {
                        case 'request':
                            socketServer.send(m.origin, {
                                channel: NC_PLOT,
                                command: 'request',
                                payload: this.plots.loadedEntries.map(p => p.toJson())
                            });
                            break;

                        case 'create':
                            const plot = await this.plots.create(m.payload).toPromise();
                            const owner = _.find(unityServer.currentArClients, { id: m.origin.owner });
                            if (owner) {
                                owner.update({
                                    selectedId: plot.id,
                                    selectedType: 'plot',
                                    selectionProgress: 100
                                }, null);
                            }
                            break;

                        case 'update':
                            this.updatePlot(m.payload, m.origin);
                            break;

                        case 'remove':
                            this.removePlot(m.payload.id);
                            break;

                        default:
                            this.logError(`Unknown command ${m.command} for plots`);
                            break;
                    }
                } catch (e) {
                    this.logError(e.message);
                }
            });



        // internal events
        plots.modelCreated$
            .subscribe(m => {
                const msg: Message = {
                    channel: NC_PLOT,
                    command: 'add',
                    payload: m.toJson()
                };

                unityServer.broadcast(msg);
                socketServer.broadcast(msg);
            });

        plots.modelDeleted$
            .subscribe(m => {
                for (const unityClient of unityServer.allClients) {
                    if (unityClient.lookingAtType === 'plot' && unityClient.lookingAtId === m.id) {
                        unityClient.lookingAtType = '';
                        unityClient.lookingAtId = -1;
                    }

                    if (unityClient.selectedType === 'plot' && unityClient.selectedId === m.id) {
                        unityClient.selectedType = '';
                        unityClient.selectedId = -1;
                    }
                }

                const msg: Message = {
                    channel: NC_PLOT,
                    command: 'remove',
                    payload: { id: m.id }
                };

                unityServer.broadcast(msg);
                socketServer.broadcast(msg);
            });

        plots.modelChanges$
            .subscribe(ev => {
                const msg: Message = {
                    channel: NC_PLOT,
                    command: 'update',
                    payload: ev.model.toJson(ev.changes)
                };

                unityServer.broadcast(msg, _.without(unityServer.currentClients, ev.source));

                if (_.without(ev.changes, 'position', 'rotation').length > 0) {
                    socketServer.broadcast(msg, _.without(socketServer.currentClients, ev.source));
                }
            });
    }



    private async updatePlot(data: any, source: any) {
        const plot = await this.plots.get({ id: data.id }, false).toPromise();
        if (plot) {
            plot.update(data, source);
        }
    }

    private async removePlot(id: number) {
        this.plots.delete(id);
    }
}

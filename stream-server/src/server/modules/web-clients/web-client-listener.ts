import { NC_WEBCLIENT } from './../core/network-channel';
import { filter, map } from 'rxjs/operators';

import { Service } from '../core';
import { Manager } from '../database';
import { SocketIOServer } from './socketio-server';
import { WebClient } from './web-client';
import { merge } from 'rxjs';
import { UnityServerProxy } from '../unity';

export class WebClientListener extends Service {
    public get serviceName(): string { return 'WebClientListener'; }
    public get groupName(): string { return 'tangibles'; }

    public constructor(socketServer: SocketIOServer,
        private unityServer: UnityServerProxy,
        private webClients: Manager<WebClient>) {
        super();


        merge(socketServer.clientConnected$, socketServer.clientDisconnected$)
            .subscribe(c => c.isVoiceActive = false);

        merge(unityServer.trackingMessages$, unityServer.arMessages$)
            .pipe(filter(m => m.channel === NC_WEBCLIENT))
            .subscribe(m => {
                if (m.command === 'update') {
                    const client = webClients.findLoadedEntry({ id: m.payload.id });
                    if (client) {
                        this.update(client, m.payload, m.origin);
                    } else {
                        this.logError(`Unable to find webclient with ID ${m.payload.id}`);
                    }
                } else if (m.command === 'request') {
                    this.unityServer.broadcast({
                        channel: m.channel,
                        command: m.command,
                        payload: socketServer.currentClients.map(c => c.toJson())
                    }, [m.origin]);
                } else {
                    this.logWarning(`Unknown command ${m.command} from unity`);
                }
            });

        socketServer.messages$
            .pipe(filter(m => m.channel === NC_WEBCLIENT))
            .subscribe(m => {
                switch (m.command) {
                case 'update':
                    this.update(m.origin, m.payload, m.origin);
                    break;
                }
            });

        socketServer.clientConnected$
            .subscribe(m => {
                socketServer.send(m, {
                    channel: NC_WEBCLIENT,
                    command: 'update',
                    payload: m.toJson()
                });
            });

        webClients.modelChanges$
            .subscribe(ev => {
                socketServer.send(ev.model, {
                    channel: NC_WEBCLIENT,
                    command: 'update',
                    payload: ev.model.toJson(ev.changes)
                });
            });
    }

    private async update(client: WebClient, data: any, source: any) {
        client.update(data, source);

        // TODO: should be done by subscribing to isCalibrated changes
        // only one webclient can be calibrating at a time
        if (client.isCalibrating) {
            for (const c of this.webClients.loadedEntries) {
                if (c !== client) {
                    c.isCalibrating = false;
                }
            }
        }

    }
}

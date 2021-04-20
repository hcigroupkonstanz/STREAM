import { NC_WEBCLIENT } from '../core/network-channel';
import * as _ from 'lodash';
import { SocketIOServer } from '../web-clients';
import { Service } from '../core';
import { Manager } from '../database';
import { UnityServerProxy } from '../unity';
import { WebClient } from '../web-clients';
import { filter } from 'rxjs/operators';

export class WebClientDistributor extends Service {
    public readonly serviceName = 'WebClientDistributor';
    public groupName = 'stream';

    public constructor(webClients: Manager<WebClient>, socketio: SocketIOServer, unityServer: UnityServerProxy) {
        super();

        socketio.clientConnected$
            .subscribe(m => {
                unityServer.broadcast({
                    channel: NC_WEBCLIENT,
                    command: 'add',
                    payload: m.toJson()
                });
            });

        webClients.modelChanges$
            .subscribe(m => {
                unityServer.broadcast({
                    channel: NC_WEBCLIENT,
                    command: 'update',
                    payload: m.model.toJson(m.changes)
                }, _.without(unityServer.currentClients, m.source));
            });

        socketio.clientDisconnected$
            .subscribe(m => {
                unityServer.broadcast({
                    channel: NC_WEBCLIENT,
                    command: 'remove',
                    payload: { id: m.id }
                });
            });


        unityServer.arMessages$
            .pipe(filter(m => m.channel === NC_WEBCLIENT))
            .subscribe(async msg => {
                if (msg.command === 'update') {
                    try {
                        const payload = msg.payload;
                        const client = await webClients.get({ id: payload.id }, false).toPromise();
                        if (client !== undefined) {
                            client.update(msg.payload, msg.origin);
                        } else {
                            this.logError(`Unable to apply webclient calibration for ${payload.id}`);
                        }
                    } catch (e) {
                        this.logError(e.message);
                    }
                }
            });
    }
}

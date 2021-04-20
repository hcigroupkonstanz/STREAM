import * as _ from 'lodash';
import { SocketIOServer } from '../web-clients';
import { Service, NC_ARCLIENT } from '../core';
import { Manager } from '../database';
import { UnityServerProxy, UnityClient } from '../unity';
import { WebClient } from '../web-clients';
import { filter } from 'rxjs/operators';


export class OwnerDistributor extends Service {
    public readonly serviceName = 'OwnerDistributor';
    public groupName = 'ARts';

    public constructor(
        private webClients: Manager<WebClient>,
        private unityClients: Manager<UnityClient>,
        private socketio: SocketIOServer,
        private unityServer: UnityServerProxy) {
        super();

        socketio.messages$
            .pipe(filter(c => c.channel === NC_ARCLIENT))
            .subscribe(msg => {
                if (msg.command === 'update') {
                    const unityClient = unityClients.findLoadedEntry({ id: msg.payload.id });
                    if (unityClient) {
                        unityClient.update(msg.payload, msg.origin);
                    }
                } else if (msg.command === 'request') {
                    const owner = this.getOwner(msg.origin);
                        socketio.send(msg.origin, {
                            channel: NC_ARCLIENT,
                            command: 'request',
                            payload: owner ? owner.toJson() : null
                        });
                } else {
                    this.logError(`Unknown command ${msg.command} in arclient`);
                }
            });

        webClients.modelChanges$
            .pipe(filter(ev => _.includes(ev.changes, 'owner')))
            .subscribe(ev => {
                const owner = this.getOwner(ev.model);
                if (owner) {
                    socketio.send(ev.model, {
                        channel: NC_ARCLIENT,
                        command: 'update',
                        payload: owner.toJson()
                    });
                }
            });

        unityClients.modelChanges$
            // only send changes relevant to webclients
            .pipe(filter(ev => _.difference(ev.changes, ['position', 'rotation']).length > 0))
            .subscribe(ev => {
                const affectedClients = _.filter(socketio.currentClients, c => c.owner === ev.model.id);
                for (const wc of affectedClients) {
                    socketio.send(wc, {
                        channel: NC_ARCLIENT,
                        command: 'update',
                        payload: ev.model.toJson(ev.changes)
                    });
                }
            });

        unityServer.clientsAdded$
            .subscribe(model => {
                const affectedClients = _.filter(socketio.currentClients, c => c.owner === model.id);
                for (const wc of affectedClients) {
                    socketio.send(wc, {
                        channel: NC_ARCLIENT,
                        command: 'update',
                        payload: model.toJson()
                    });
                }
            });

        unityServer.clientsRemoved$
            .subscribe(model => {
                const affectedClients = _.filter(socketio.currentClients, c => c.owner === model.id);
                for (const wc of affectedClients) {
                    socketio.send(wc, {
                        channel: NC_ARCLIENT,
                        command: 'update',
                        payload: null
                    });
                }
            });
    }


    private getOwner(web: WebClient): UnityClient {
        const owner = _.find(this.unityServer.currentArClients, ar => ar.id === web.owner);
        if (!owner) {
            this.logWarning(`Unable to find owner ${web.owner} of webclient ${web.id}`);
        }
        return owner;
    }
}

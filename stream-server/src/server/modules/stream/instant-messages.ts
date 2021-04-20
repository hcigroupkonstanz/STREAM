import { NC_CONTROL } from '../core/network-channel';
import * as _ from 'lodash';
import { Service } from '../core';
import { UnityServerProxy } from '../unity';
import { SocketIOServer } from '../web-clients';
import { filter } from 'rxjs/operators';

export class InstantMessages extends Service {
    public serviceName = 'InstantMessages';
    public groupName = 'stream';

    public constructor(
        unityServer: UnityServerProxy,
        socketio: SocketIOServer
    ) {
        super();

        unityServer.arMessages$
            .pipe(filter(msg => msg.channel === NC_CONTROL))
            .subscribe(msg => {
                const userTablet = _.find(socketio.currentClients, c => c.owner === msg.origin.id);
                if (userTablet) {
                    socketio.broadcast({
                        channel: msg.channel,
                        command: msg.command,
                        payload: msg.payload
                    }, [userTablet]);
                }
            });

        socketio.messages$
            .pipe(filter(msg => msg.channel === NC_CONTROL))
            .subscribe(msg => {
                const owner = _.find(unityServer.currentArClients, c => c.id === msg.origin.owner);

                if (owner) {
                    unityServer.broadcast({
                        channel: msg.channel,
                        command: msg.command,
                        payload: msg.payload
                    }, [owner]);
                }
            });
    }
}

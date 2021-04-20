import { NC_VOICE } from './../core/network-channel';
import * as _ from 'lodash';
import { SocketIOServer } from '../web-clients';
import { Service } from '../core';
import { Manager } from '../database';
import { UnityServerProxy, UnityClient } from '../unity';
import { WebClient } from '../web-clients';
import { filter } from 'rxjs/operators';


export class VoiceListener extends Service {
    public readonly serviceName = 'VoiceListener';
    public groupName = 'ARts';

    public constructor(
        socketio: SocketIOServer,
        unityServer: UnityServerProxy,
        webclients: Manager<WebClient>) {
        super();

        unityServer.arMessages$
            .pipe(filter(m => m.channel === NC_VOICE))
            .subscribe(m => {
                const tablet = _.find(socketio.currentClients, c => c.owner === m.origin.id);
                if (tablet) {
                    socketio.send(tablet, m);
                }
            });
    }
}

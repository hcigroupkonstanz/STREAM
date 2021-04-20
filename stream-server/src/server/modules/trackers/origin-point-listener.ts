import { NC_ORIGIN } from './../core/network-channel';
import { OriginPoint } from './origin-point';
import { Service } from '../core';
import { Manager } from '../database';
import { UnityServerProxy } from '../unity';
import { filter } from 'rxjs/operators';
import { merge } from 'rxjs';

export class OriginPointListener extends Service {
    public serviceName = 'OriginPointListener';
    public groupName = 'tracking';

    public constructor(
        private originPointManager: Manager<OriginPoint>,
        private unityServer: UnityServerProxy) {
        super();

        merge(unityServer.trackingMessages$, unityServer.arMessages$)
            .pipe(filter(m => m.channel === NC_ORIGIN))
            .subscribe(m => this.handleMessage(m.command, m.payload, m.origin));
    }


    private async handleMessage(command: string, payload: any, origin: any) {
        switch (command) {
            case 'set1':
                this.logDebug(`Setting origin point 1 to ${payload}`);
                this.originPointManager
                    .get({ id: 1 }, true)
                    .subscribe(p => p.update(payload, origin));
                break;
            case 'set2':
                this.logDebug(`Setting origin point 2 to ${payload}`);
                this.originPointManager
                    .get({ id: 2 }, true)
                    .subscribe(p => p.update(payload, origin));
                break;
            case 'request':
                const op1 = await this.originPointManager.get({ id: 1 }, true).toPromise();
                const op2 = await this.originPointManager.get({ id: 2 }, true).toPromise();
                this.unityServer.broadcast({
                    channel: NC_ORIGIN,
                    command: 'request',
                    payload: [ op1.toJson(), op2.toJson() ]
                });
                break;
        }
    }
}

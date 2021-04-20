import { NC_UNITYCLIENT, NC_ARCLIENT } from './../core/network-channel';
import * as _ from 'lodash';
import { merge } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Service } from '../core';
import { Manager } from '../database';
import { UnityServerProxy } from './unity-server-proxy';
import { UnityClient } from './unity-client';

export class UnityClientListener extends Service {
    public get serviceName(): string { return 'UnityClientListener'; }
    public get groupName(): string { return 'unity'; }

    public constructor(private unityServer: UnityServerProxy, private unityClients: Manager<UnityClient>) {
        super();

        merge(unityServer.arMessages$, unityServer.trackingMessages$)
            .pipe(filter(m => m.channel === NC_UNITYCLIENT))
            .subscribe((m) => {
                switch (m.command) {
                case 'request':
                    unityServer.broadcast({
                        channel: NC_UNITYCLIENT,
                        command: 'request',
                        payload: m.origin.toJson()
                    }, [ m.origin ]);
                    break;

                case 'update':
                    m.origin.update(m.payload, m.origin);
                    break;
                }
            });


        merge(unityServer.arMessages$, unityServer.trackingMessages$)
            .pipe(filter(m => m.channel === NC_ARCLIENT))
            .subscribe((m) => {
                switch (m.command) {
                case 'update':
                    const target = unityClients.findLoadedEntry({ id: m.payload.id });
                    if (target) {
                        target.update(m.payload, m.origin);
                    }
                    break;
                case 'request':
                    const clients = unityServer.currentArClients.map(c => c.toJson());
                    unityServer.broadcast({
                        channel: NC_ARCLIENT,
                        command: 'request',
                        payload: clients
                    }, [m.origin]);
                }
            });

        unityClients.modelChanges$
            // no need to send back updates to origin
            .pipe(filter(ev => ev.source !== ev.model))
            .subscribe(ev => {
                this.unityServer.broadcast({
                    channel: NC_UNITYCLIENT,
                    command: 'update',
                    payload: ev.model.toJson(ev.changes)
                }, [ev.model]);
            });

        unityServer.clientsAdded$.subscribe(c => {
            c.isCalibrating = true;
        });
    }
}

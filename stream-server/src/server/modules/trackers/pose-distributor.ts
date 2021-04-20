import { NC_ORIGIN, NC_TRACKER } from './../core/network-channel';
import * as _ from 'lodash';
import { from } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Service, Message, NC_ARCLIENT } from '../core';
import { Manager, ChangeEvent } from '../database';
import { UnityClient, UnityServerProxy } from '../unity';
import { WebClient, SocketIOServer } from '../web-clients';

import { OriginPoint } from './origin-point';
import { Tracker } from './tracker';

export class PoseDistributor extends Service {
    public get serviceName(): string { return 'Poses'; }
    public get groupName(): string { return 'tracking'; }

    public constructor(
        private viveTrackerManager: Manager<Tracker>,
        private unityClientManager: Manager<UnityClient>,
        private unityServer: UnityServerProxy,
        private webClientManager: Manager<WebClient>,
        private webClientServer: SocketIOServer,
        private originPoint: Manager<OriginPoint>) {

        super();


        // unity AR clients
        from(unityServer.currentClients)
            .pipe(filter(c => c.type === 'ar'))
            .subscribe(c => this.handleUnityClientAdded(c));
        this.unityServer.clientsAdded$
            .pipe(filter(c => c.type === 'ar'))
            .subscribe(c => this.handleUnityClientAdded(c));
        this.unityServer.clientsRemoved$
            .pipe(filter(c => c.type === 'ar'))
            .subscribe(c => this.handleUnityClientRemoved(c));
        unityClientManager.modelChanges$
            .pipe(filter(m => m.model.type === 'ar'))
            .subscribe(ev => this.handleUnityUpdate(ev));



        // tracker
        from(viveTrackerManager.loadedEntries)
            .pipe(filter(x => x.isActive))
            .subscribe(tracker => this.handleTrackerAdded(tracker));
        viveTrackerManager.modelCreated$
            .subscribe(tracker => this.handleTrackerAdded(tracker));
        viveTrackerManager.modelDeleted$
            .subscribe(tracker => this.handleTrackerRemoved(tracker));
        viveTrackerManager.modelChanges$
            .subscribe(ev => this.handleTrackerUpdate(ev));


        // for calibration
        originPoint.modelChanges$.subscribe(e => {
            unityServer.broadcast({
                channel: NC_ORIGIN,
                command: 'origin',
                payload: e.model.toJson()
            }, unityServer.currentArClients);
        });
    }


    private handleTrackerAdded(tracker: Tracker): void {
        const msg: Message = {
            channel: NC_TRACKER,
            command: 'add',
            payload: tracker.toJson()
        };
        this.unityServer.broadcast(msg, this.unityServer.currentArClients);
        this.webClientServer.broadcast(msg);
    }

    private handleTrackerRemoved(tracker: Tracker): void {
        const msg: Message = {
            channel: NC_TRACKER,
            command: 'remove',
            payload: {
                id: tracker.id
            }
        };
        this.unityServer.broadcast(msg, this.unityServer.currentArClients);
        this.webClientServer.broadcast(msg);
    }

    private handleTrackerUpdate(ev: ChangeEvent<Tracker>): void {
        const msg: Message = {
            channel: NC_TRACKER,
            command: 'update',
            payload: ev.model.toJson(ev.changes)
        };

        this.unityServer.broadcast(msg, this.unityServer.currentArClients);
        if (_.includes(ev.changes, 'name') || _.includes(ev.changes, 'isActive')) {
            this.webClientServer.broadcast(msg);
        }
    }



    private handleUnityClientAdded(client: UnityClient): void {
        this.unityServer.broadcast({
            channel: NC_ARCLIENT,
            command: 'add',
            payload: client.toJson()
        }, _.without(this.unityServer.currentClients, client));
    }

    private handleUnityClientRemoved(client: UnityClient): void {
        this.unityServer.broadcast({
            channel: NC_ARCLIENT,
            command: 'remove',
            payload: {
                id: client.id
            }
        }, _.without(this.unityServer.currentClients, client));
    }

    private handleUnityUpdate(ev: ChangeEvent<UnityClient>): void {
        this.unityServer.broadcast({
            channel: NC_ARCLIENT,
            command: 'update',
            payload: ev.model.toJson(ev.changes)
        }, _.without(this.unityServer.currentClients, ev.model));
    }
}

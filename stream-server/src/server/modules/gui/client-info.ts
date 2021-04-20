import { AdminSocketIoServer } from './admin-socket-io';
import { merge } from 'rxjs';
import { Service } from '../core';
import { Manager } from '../database';
import { UnityClient, UnityServerProxy } from '../unity';
import { WebClient, SocketIOServer } from '../web-clients';
import * as _ from 'lodash';
import { mapTo, map, auditTime, delay, tap } from 'rxjs/operators';
import { Tracker } from '../trackers';
import { Link, Plot } from '../plots';
import * as os from 'os';

export class ClientInfo extends Service {
    public get serviceName() { return 'ClientInfo'; }
    public get groupName() { return 'gui'; }

    public constructor(
        private adminSocketServer: AdminSocketIoServer,
        private unityServer: UnityServerProxy,
        private unityClients: Manager<UnityClient>,
        private webServer: SocketIOServer,
        private webClients: Manager<WebClient>,
        private trackers: Manager<Tracker>,
        private plots: Manager<Plot>,
        private links: Manager<Link>) {
        super();

    }

    init() {
        super.init();

        merge(this.adminSocketServer.clients$, this.unityServer.clients$, this.unityClients.modelChanges$).pipe(
            auditTime(100),
            mapTo(this.unityServer.currentClients),
            map(clients => _.map(clients, c => c.toJson()))
        ).subscribe(clients => this.adminSocketServer.sendMessage('unityclients', clients));

        merge(this.adminSocketServer.clients$, this.webServer.clients$, this.webClients.modelChanges$).pipe(
            mapTo(this.webServer.currentClients),
            map(clients => _.map(clients, c => c.toJson()))
        ).subscribe(clients => this.adminSocketServer.sendMessage('webclients', clients));

        merge(this.adminSocketServer.clients$, this.trackers.modelChanges$).pipe(
            auditTime(100),
            mapTo(this.trackers.loadedEntries),
            map(ts => _(ts).filter(t => t.isActive).map(t => t.toJson()).value())
        ).subscribe(ts => this.adminSocketServer.sendMessage('trackers', ts));

        merge(this.adminSocketServer.clients$, this.plots.modelChanges$, this.plots.modelCreated$, this.plots.modelDeleted$).pipe(
            auditTime(100),
            mapTo(this.plots.loadedEntries),
            map(ps => _.map(ps, p => p.toJson())),
            tap(ps => {
                for (const p of ps) {
                    delete p['data'];
                }
            })
        ).subscribe(ts => this.adminSocketServer.sendMessage('plots', ts));

        merge(this.adminSocketServer.clients$, this.links.modelChanges$, this.links.modelCreated$, this.links.modelDeleted$).pipe(
            auditTime(100),
            mapTo(this.links.loadedEntries),
            map(ps => _.map(ps, p => p.toJson()))
        ).subscribe(ts => this.adminSocketServer.sendMessage('links', ts));



        this.adminSocketServer.clients$.pipe(delay(100)).subscribe(() => {
            const ips = [];

            // see: https://stackoverflow.com/questions/3653065/get-local-ip-address-in-node-js
            const ifaces = os.networkInterfaces();

            Object.keys(ifaces).forEach(function (ifname) {
                ifaces[ifname].forEach(function (iface) {
                    if ('IPv4' !== iface.family || iface.internal !== false) {
                        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                        return;
                    }

                    ips.push(iface.address);
                });
            });

            this.adminSocketServer.sendMessage('ips', ips);
        });
    }
}

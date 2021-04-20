import { Message, Service, NC_LINK } from '../core';
import { Manager } from '../database';
import { UnityServerProxy } from '../unity';
import { SocketIOServer } from '../web-clients';
import { Plot } from './plot';
import { filter } from 'rxjs/operators';
import { Link } from './link';

import * as _ from 'lodash';
import { merge } from 'rxjs';

export class LinkListener extends Service {
    public serviceName = 'LinkListener';
    public groupName = 'data';

    public constructor(
        private links: Manager<Link>,
        private plots: Manager<Plot>,
        private socketServer: SocketIOServer,
        private unityServer: UnityServerProxy) {
        super();

        // cleanup
        unityServer.clientsRemoved$
            .subscribe(c => {
                for (const link of links.loadedEntries) {
                    if (link.createdBy === c.id) {
                        this.logDebug('Cleaning up invalid link due to unityclient disconnect');
                        this.removeLink(link.id);
                    }
                }
            });

        plots.modelDeleted$
            .subscribe(p => {
                for (const link of links.loadedEntries) {
                    if (link.upstream === p.id || link.downstream === p.id) {
                        this.removeLink(link.id);
                    }
                }

                for (const unityClient of unityServer.allClients) {
                    if (unityClient.lookingAtType === 'plot' && unityClient.lookingAtId === p.id) {
                        unityClient.lookingAtType = '';
                        unityClient.lookingAtId = -1;
                    }

                    if (unityClient.selectedType === 'plot' && unityClient.selectedId === p.id) {
                        unityClient.selectedType = '';
                        unityClient.selectedId = -1;
                    }
                }

                for (const webClient of socketServer.currentClients) {
                    if (webClient.lookingAtType === 'plot' && webClient.lookingAtId === p.id) {
                        webClient.lookingAtType = '';
                        webClient.lookingAtId = -1;
                    }
                }
            });


        // external updates
        socketServer.messages$
            .pipe(filter(m => m.channel === NC_LINK))
            .subscribe(m => {
                try {
                    switch (m.command) {
                        case 'create':
                            this.links.create(m.payload);
                            break;

                        case 'request':
                            socketServer.send(m.origin, {
                                channel: NC_LINK,
                                command: 'request',
                                payload: this.links.loadedEntries.map(l => l.toJson())
                            });
                            break;

                        case 'update':
                            this.updateLink(m.payload, m.origin);
                            break;

                        case 'remove':
                            this.removeLink(m.payload.id);
                            break;

                        default:
                            this.logError(`Unknown command ${m.command} for links`);
                            break;
                    }
                } catch (e) {
                    this.logError(e.message);
                }
            });


        merge(unityServer.arMessages$, unityServer.trackingMessages$)
            .pipe(filter(m => m.channel === NC_LINK))
            .subscribe(msg => {
                if (msg.command === 'update') {
                    this.updateLink(msg.payload, msg.origin);
                } else if (msg.command === 'request') {
                    unityServer.broadcast({
                        channel: NC_LINK,
                        command: 'request',
                        payload: this.links.loadedEntries.map(l => l.toJson())
                    }, [msg.origin]);
                } else {
                    this.logWarning(`Unknown command ${msg.command} from tracking server`);
                }
            });




        // internal events
        links.modelCreated$
            .subscribe(m => {
                if (this.isLinkInvalid(m)) {
                    this.logWarning('Removing invalid link during creation');
                    this.removeLink(m.id);
                } else {
                    const msg: Message = {
                        channel: NC_LINK,
                        command: 'add',
                        payload: m.toJson()
                    };

                    unityServer.broadcast(msg);
                    socketServer.broadcast(msg);
                }
            });

        links.modelDeleted$
            .subscribe(m => {
                for (const unityClient of unityServer.currentArClients) {
                    if (unityClient.lookingAtType === 'link' && unityClient.lookingAtId === m.id) {
                        unityClient.lookingAtType = '';
                        unityClient.lookingAtId = -1;
                    }

                    if (unityClient.selectedType === 'link' && unityClient.selectedId === m.id) {
                        unityClient.selectedType = '';
                        unityClient.selectedId = -1;
                    }
                }

                for (const webClient of socketServer.currentClients) {
                    if (webClient.lookingAtType === 'link' && webClient.lookingAtId === m.id) {
                        webClient.lookingAtType = '';
                        webClient.lookingAtId = -1;
                    }
                }

                const msg: Message = {
                    channel: NC_LINK,
                    command: 'remove',
                    payload: { id: m.id }
                };

                unityServer.broadcast(msg);
                socketServer.broadcast(msg);
            });

        links.modelChanges$
            .subscribe(ev => {
                if (this.isLinkInvalid(ev.model)) {
                    this.logWarning('Removing invalid link during modification');
                    this.removeLink(ev.model.id);
                } else {
                    const msg: Message = {
                        channel: NC_LINK,
                        command: 'update',
                        payload: ev.model.toJson(ev.changes)
                    };

                    unityServer.broadcast(msg, _.without(unityServer.currentClients, ev.source));

                    if (_.without(ev.changes, 'placingPosition', 'placingRotation').length > 0) {
                        socketServer.broadcast(msg, _.without(socketServer.currentClients, ev.source));
                    }
                }
            });
    }

    public init(): void {
        super.init();
        for (const link of this.links.loadedEntries) {
            if (this.isLinkInvalid(link)) {
                this.logWarning('Removing invalid link during startup');
                this.removeLink(link.id);
            }
        }
    }


    private isLinkInvalid(link: Link): boolean {
        // invalid link: not being created, but not fully connected
        const isNotFullyConnected = link.createdBy === -1 && (link.downstream === -1 || link.upstream === -1);
        const hasSameSource = link.upstream === link.downstream;
        const containsInvalidUpstreamId = link.upstream > 0 && this.plots.loadedEntries.find(p => p.id === link.upstream) === undefined;
        const containsInvalidDownstreamId = link.downstream > 0 && this.plots.loadedEntries.find(p => p.id === link.downstream) === undefined;
        return isNotFullyConnected || hasSameSource || containsInvalidDownstreamId || containsInvalidUpstreamId;
    }

    private async updateLink(data: any, source: any) {
        const link = await this.links.get({ id: data.id }, false).toPromise();
        if (link) {
            link.update(data, source);
        }
    }

    private removeLink(id: number) {
        this.links.delete(id);
    }
}

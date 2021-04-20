import * as _ from 'lodash';
import { Injectable } from '@angular/core';
import { SocketIO } from './socket-io.service';
import { Logger } from './logger.service';
import { Link, WebClient, NC_LINK } from '@stream/models';
import { RemoteService } from './remote-service';
import { Subject } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class LinkService extends RemoteService {

    public readonly links: Link[] = [];

    private readonly remoteUpdateStream = new Subject<{ model: Link, changes: string[]}>();
    public readonly remoteUpdates$ = this.remoteUpdateStream.asObservable();

    private readonly localUpdateStream = new Subject<{ model: Link, changes: string[]}>();
    public readonly localUpdates$ = this.localUpdateStream.asObservable();

    constructor(
        private socketIO: SocketIO,
        private logger: Logger
    ) {
        super();
        this.initialize();

        // for debugging
        window['links'] = this.links;
    }

    private initialize() {
        this.socketIO.send(NC_LINK, 'request', null);

        this.socketIO.on(NC_LINK, (cmd, payload) => {
            this.anyUpdateStream.next();

            switch (cmd) {
                case 'request':
                    // clear old links
                    while (this.links.length > 0) {
                        const p = this.links.pop();
                        p.destroy();
                    }

                    for (const p of payload) {
                        this.addLink(p);
                    }

                    this._initialized.next(true);
                    break;

                case 'add':
                case 'update':
                case 'data':
                    this.updateLink(payload);
                    break;
                case 'remove':
                    this.removeLink(payload.id);
                    break;
                default:
                    this.logger.error(`Unknown command ${cmd} for links`);
                    break;
            }
        });
    }

    public create(upstream: number) {
        this.socketIO.send(NC_LINK, 'create', {
            createdBy: WebClient.Instance.owner,
            upstream: upstream
        });
    }

    public async getLink(id: number): Promise<Link | null> {
        await this.initialized;
        return _.find(this.links, p => p.id === id);
    }

    private addLink(data: any): Link {
        const link = new Link();
        link.remoteUpdate(data);
        this.links.push(link);

        link.localModelChanges$.subscribe(changes => {
            this.localUpdateStream.next({ model: link, changes: changes });
            this.socketIO.send(NC_LINK, 'update', link.toJson(changes));
            this.anyUpdateStream.next();
        });

        this.anyUpdateStream.next();

        return link;
    }

    private async updateLink(data: any): Promise<Link> {
        const link = await this.getLink(data.id);
        if (!link) {
            return this.addLink(data);
        } else {
            link.remoteUpdate(data);
            this.remoteUpdateStream.next({ model: link, changes: _.keys(data) });
            this.anyUpdateStream.next();
            return link;
        }
    }

    private removeLink(id: number): void {
        const removed = _.remove(this.links, p => p.id === id);
        for (const link of removed) {
            link.destroy();
        }

        this.anyUpdateStream.next();
    }

    public remove(id: number): void {
        this.removeLink(id);
        this.socketIO.send(NC_LINK, 'remove', { id: id });
        this.anyUpdateStream.next();
    }
}

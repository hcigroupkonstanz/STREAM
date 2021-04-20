import * as _ from 'lodash';
import { UNITY_SERVER_WORKER } from './unity-server-worker';
import { Message, WorkerServiceProxy } from '../core';
import { Manager } from '../database';
import { Subject } from 'rxjs';
import { UnityClient } from './unity-client';

export interface UnityMessage extends Message {
    origin: UnityClient;
}

export class UnityServerProxy extends WorkerServiceProxy {
    public serviceName = 'UnityServer';
    public groupName = 'unity';

    private clients: UnityClient[] = [];
    private clientStream = new Subject<UnityClient[]>();
    private clientAddedStream = new Subject<UnityClient>();
    private clientRemovedStream = new Subject<UnityClient>();

    private arMessageStream = new Subject<UnityMessage>();
    private trackingMessageStream = new Subject<UnityMessage>();

    // for debugging / performance monitoring
    private readonly outgoingStream = new Subject<{ channel: number, size: number }>();
    private readonly incomingStream = new Subject<{ channel: number, size: number }>();

    // For capturing outgoing data
    private readonly outgoingMessageStream = new Subject<{ msg: Message, clients: number[] }>();

    public get clients$() { return this.clientStream.asObservable(); }
    public get clientsAdded$() { return this.clientAddedStream.asObservable(); }
    public get clientsRemoved$() { return this.clientRemovedStream.asObservable(); }
    public get currentClients(): ReadonlyArray<UnityClient> { return this.clients; }
    public get currentArClients(): ReadonlyArray<UnityClient> { return _.filter(this.clients, { type: 'ar' }); }
    public get currentTrackerClients(): ReadonlyArray<UnityClient> { return _.filter(this.clients, { type: 'tracker' }); }
    public get allClients(): ReadonlyArray<UnityClient> { return this.unityClientMapper.loadedEntries; }
    public get arMessages$() { return this.arMessageStream.asObservable(); }
    public get trackingMessages$() { return this.trackingMessageStream.asObservable(); }
    public get outgoing$() { return this.outgoingStream.asObservable(); }
    public get outgoingMessages$() { return this.outgoingMessageStream.asObservable(); }
    public get incoming$() { return this.incomingStream.asObservable(); }



    public constructor(private unityClientMapper: Manager<UnityClient>) {
        super();
        this.initWorker(UNITY_SERVER_WORKER);

        this.workerMessages$.subscribe(msg => {
            switch (msg.channel) {
                case 'clientConnected$':
                    this.onClientConnected(msg.content.name, msg.content.type);
                    break;

                case 'clientDisconnected$':
                    this.onClientDisconnected(msg.content.name);
                    break;

                case 'clientMessage$':
                    this.onClientMessage(msg.content.name, msg.content.packet);
                    break;

                case 'debugIncoming$':
                    this.incomingStream.next({
                        channel: msg.content.channel,
                        size: msg.content.size
                    });
                    break;
                case 'debugOutgoing$':
                    this.outgoingStream.next({
                        channel: msg.content.channel,
                        size: msg.content.size
                    });
                    break;
            }
        });
    }

    public start(arPort: number, trackerPort: number): void {
        this.postMessage('m:start', {
            arPort: arPort,
            trackerPort: trackerPort
        });

        this.clientStream.next(this.clients);
    }

    public stop(): void {
        this.postMessage('m:stop');
    }

    public broadcast(msg: Message, clients: ReadonlyArray<UnityClient> = this.clients): void {
        this.postMessage('m:broadcast', {
            msg: msg,
            clients: _.map(clients, c => c.name)
        });
        this.outgoingMessageStream.next({ msg: msg, clients: clients.map(c => c.id) });
    }


    private async onClientConnected(name: string, type: 'ar' | 'tracker') {
        const client = await this.unityClientMapper.get({
            name: name,
            type: type
        }, true).toPromise();

        this.clients.push(client);
        this.clientAddedStream.next(client);
        this.clientStream.next(this.clients);
    }

    private onClientDisconnected(name: string): void {
        const removedClients = _.remove(this.clients, c => c.name === name);
        for (const client of removedClients) {
            this.clientRemovedStream.next(client);
        }
        this.clientStream.next(this.clients);
    }

    private onClientMessage(name: string, msg: UnityMessage): void {
        const client = _.find(this.clients, c => c.name === name);
        if (client) {
            msg.origin = client;
            if (client.type === 'ar') {
                this.arMessageStream.next(msg);
            } else {
                this.trackingMessageStream.next(msg);
            }
        }
    }
}

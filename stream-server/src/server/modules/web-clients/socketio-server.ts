import * as socketio from 'socket.io';
import * as _ from 'lodash';
import { Server as HttpServer } from 'http';
import { Observable, Subject, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { Service, Message } from '../core';
import { Manager } from '../database';
import { WebClient } from './web-client';

class SocketIoClient extends WebClient {
    socket: SocketIO.Socket;
}

interface SocketMessage extends Message {
    origin: SocketIoClient;
}

export class SocketIOServer extends Service {
    public get serviceName(): string { return 'SocketIO'; }
    public get groupName(): string { return 'tangibles'; }

    private ioServer: SocketIO.Server;

    private readonly clients: SocketIoClient[] = [];
    private readonly clientStream = new Subject<WebClient[]>();
    private readonly clientConnectedStream = new Subject<WebClient>();
    private readonly clientDisconnectedStream = new Subject<WebClient>();
    private readonly messageStream = new Subject<SocketMessage>();

    // For capturing outgoing data
    private readonly outgoingMessageStream = new Subject<{ msg: Message, clients: number[] }>();

    // for debugging / performance monitoring
    private outgoingStream = new Subject<{ channel: number, size: number }>();
    private incomingStream = new Subject<{ channel: number, size: number }>();

    public constructor(private webClientMapper: Manager<WebClient>) {
        super();
    }


    public start(server: HttpServer): void {
        this.ioServer = socketio(server);

        this.ioServer.on('connection', (socket) => {
            this.handleNewClient(socket);
        });

        this.logInfo('Successfully attached SocketIO to webserver');
        this.clientStream.next(this.clients);
    }

    public stop(): void {
        this.ioServer.close();
        this.logInfo('Stopped SocketIO server');
    }

    public get clients$() { return this.clientStream.asObservable(); }
    public get clientConnected$() { return this.clientConnectedStream.asObservable(); }
    public get clientDisconnected$() { return this.clientDisconnectedStream.asObservable(); }
    public get currentClients() { return this.clients; }
    public get messages$() { return this.messageStream.asObservable(); }
    public get outgoing$() { return this.outgoingStream.asObservable(); }
    public get incoming$() { return this.incomingStream.asObservable(); }
    public get outgoingMessages$() { return this.outgoingMessageStream.asObservable(); }

    public broadcast(msg: Message, clients = this.currentClients): void {
        // TODO: more efficient method?
        for (const client of clients) {
            this.send(client, msg);
        }

        // for logging purposes...
        if (clients.length === 0) {
            this.outgoingMessageStream.next({ msg: msg, clients: [] });
        }
    }

    public send(client: WebClient, msg: Message): void {
        try {
            const sClient = client as SocketIoClient;
            sClient.socket.emit('cmd', {
                channel: msg.channel,
                command: msg.command,
                payload: msg.payload
            });
        } catch (e) {
            this.logError(e.message);
        }

        this.outgoingMessageStream.next({ msg: msg, clients: [client.id] });
        // TODO: size...
        this.outgoingStream.next({ channel: msg.channel, size: 10 });
    }


    private handleNewClient(socket: SocketIO.Socket): void {
        let clientName = socket.handshake.query.name;
        if (!clientName) {
            this.logWarning(`Connection ${socket.conn.remoteAddress} has no name, generating temporary name...`);
            clientName = Math.floor(1 + Math.random() * 0x10000).toString(16);
        }

        this.logDebug(`New SocketIO connection from ${socket.conn.remoteAddress}: ${clientName}`);

        this.webClientMapper.get({ name: clientName }, true)
            .pipe(take(1))
            .subscribe(webClient => {
                const existingClient = this.clients.find(c => c.name === clientName);
                if (existingClient) {
                    this.logWarning(`Duplicate connection from ${existingClient.socket.conn.remoteAddress}, terminating old connection..`);
                    existingClient.socket.disconnect();
                }

                const client = <SocketIoClient>webClient;
                client.socket = socket;

                this.clients.push(client);
                this.clientConnectedStream.next(client);
                this.clientStream.next(this.clients);
                this.logDebug(`Client ${client.name} (${client.id}) connected`);

                socket.use(([channel, content]: SocketIO.Packet, next) => {
                    const msg: SocketMessage = {
                        origin: client,
                        channel: content.channel,
                        command: content.command,
                        payload: content.payload
                    };
                    this.messageStream.next(msg);
                    // TODO: size...
                    this.incomingStream.next({ channel: content.channel, size: content });
                    next();
                });

                socket.on('error', error => {
                    this.logError(JSON.stringify(error));
                });

                socket.on('disconnect', () => {
                    this.handleSocketDisconnect(socket);
                });
        });

    }

    private handleSocketDisconnect(socket: SocketIO.Socket): void {
        const removedClients = _.remove(this.clients, client => client.socket === socket);
        this.clientStream.next(this.clients);

        for (const rc of removedClients) {
            this.logDebug(`Client ${rc.name} disconnected`);
            this.clientDisconnectedStream.next(rc);
        }
    }
}

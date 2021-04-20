import * as socketio from 'socket.io';
import * as _ from 'lodash';
import { Server as HttpServer } from 'http';
import { Observable, Subject } from 'rxjs';

import { Service, Message } from '../core';
import { GuiChannel } from './gui-channel';
import { GuiMessage } from './gui-message';

export class AdminSocketIoServer extends Service {
    public get serviceName(): string { return 'AdminSocketIO'; }
    public get groupName(): string { return 'gui'; }

    public isRunning = false;

    private ioServer: SocketIO.Server;
    private readonly messageStream = new Subject<GuiMessage>();
    private readonly clientStream = new Subject<void>();
    private readonly clientConnectedStream = new Subject<SocketIO.Socket>();
    private readonly commands: { [key: string]: (args: string[]) => void } = {};

    public get clients$(): Observable<void> {
        return this.clientStream.asObservable();
    }

    public get clientConnected$() {
        return this.clientConnectedStream.asObservable();
    }

    public get messages$(): Observable<GuiMessage> {
        return this.messageStream.asObservable();
    }

    public constructor(private evalInput: (string) => string) {
        super();
    }


    public start(server: HttpServer): void {
        this.ioServer = socketio(server);

        this.ioServer.on('connection', (socket) => {
            this.handleNewClient(socket);
        });


        this.logInfo('Successfully attached admin SocketIO to webserver');
        this.isRunning = true;
    }

    public stop(): void {
        this.ioServer.close();
        this.logInfo('Stopped admin SocketIO server');
    }


    public sendMessage(channel: string, content: any): void {
        if (this.ioServer) {
            this.ioServer.emit(channel, content);
        }
    }


    private handleNewClient(socket: SocketIO.Socket): void {
        this.clientStream.next();
        this.clientConnectedStream.next(socket);

        socket.use(([channel, content]: SocketIO.Packet, next) => {
            if (channel === 'evaluate') {
                this.onEval(content);
            } else if (channel === 'command') {
                this.onCommand(content);
            } else {
                const msg: GuiMessage = {
                    channel: <GuiChannel>channel,
                    data: content
                };
                this.messageStream.next(msg);
                next();
            }
        });

        socket.on('error', error => {
            this.logError(JSON.stringify(error));
        });

        socket.on('disconnect', () => {
            this.handleSocketDisconnect(socket);
        });

    }

    private handleSocketDisconnect(socket: SocketIO.Socket): void {
        // ?
    }


    public registerCommand(cmd: string, action: (args: string[]) => void): void {
        const lccmd = cmd.toLowerCase();
        if (this.commands[lccmd] !== undefined) {
            this.logWarning(`Overriding command '${lccmd}'`)
        }

        this.commands[lccmd] = action;
    }

    private onCommand(arg: string) {
        const input = arg.toLowerCase().split(' ');
        const cmd = input[0];
        const args = input.slice(1);

        const action = this.commands[cmd];

        if (action) {
            this.logInfo(`> ${arg}`);
            action(args);
        } else {
            this.logWarning(`Unknown command: '${cmd}'`);
        }
    }

    private onEval(input: string) {
        try {
            this.logDebug(input);
            this.logDebug(JSON.stringify(this.evalInput(input), null, 2));
        } catch (e) {
            this.logError(e.message, false);
        }
    }
}

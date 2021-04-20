import { NC_REGISTRATION } from './../core/network-channel';
import * as net from 'net';
import * as _ from 'lodash';
import { Message, WorkerService } from '../core';
import * as threads from 'worker_threads';


export const UNITY_SERVER_WORKER = __filename;

class TcpClient {
    public address: string;
    public socket: net.Socket;
    public leftOverBuffer: string;
    public isRegistered: boolean;
    public type: 'ar' | 'tracker';
    public name?: string;
}

export class UnityServerWorker extends WorkerService {
    private arServer: net.Server;
    private trackerServer: net.Server;

    private readonly clients: TcpClient[] = [];

    private heartbeatInterval: NodeJS.Timer;

    public constructor() {
        super(true);

        this.parentMessages$.subscribe(msg => {
            switch (msg.channel) {
                case 'm:start':
                    this.start(msg.content.arPort, msg.content.trackerPort);
                    break;

                case 'm:stop':
                    this.stop();
                    break;

                case 'm:broadcast':
                    const clients = _(msg.content.clients)
                        .map(name => _.find(this.clients, c => c.name === name))
                        .filter(c => !!c)
                        .value();

                    this.broadcast(msg.content.msg, clients);
                    break;
            }
        });
    }

    public start(arPort: number, trackerPort: number): void {
        this.arServer = net.createServer((socket) => this.handleConnection(socket, 'ar'));
        this.arServer.listen(arPort);

        this.trackerServer = net.createServer((socket) => this.handleConnection(socket, 'tracker'));
        this.trackerServer.listen(trackerPort);

        this.logInfo(`Starting Unity server on *:${arPort} for AR, *:${trackerPort} for trackers`);
        this.heartbeatInterval = setInterval(() => this.handleHeartbeat(), 100);
    }

    public stop(): void {
        this.arServer.close();
        this.trackerServer.close();
        clearInterval(this.heartbeatInterval);
    }



    public broadcast(msg: Message, clients: ReadonlyArray<TcpClient> = this.clients): void {
        if (clients.length === 0) {
            return;
        }

        const msgString = JSON.stringify(msg);
        const msgBytes = this.toUTF8Array(msgString);

        for (const client of clients) {
            // message format:
            // \0\0\0(PacketHeader)\0(ActualMessage)
            const tcpClient = client;
            tcpClient.socket.write('\0\0\0' + msgBytes.length.toString() + '\0');
            tcpClient.socket.write(msgString);
        }

        this.postMessage('debugOutgoing$', { channel: msg.channel, size: msgBytes.length * clients.length });
    }

    private handleConnection(socket: net.Socket, type: 'ar' | 'tracker'): void {
        this.logDebug(`New unity client connected from ${socket.remoteAddress}, waiting for registration...`);
        socket.setNoDelay(true);

        const tcpClient: TcpClient = {
            address: socket.remoteAddress,
            leftOverBuffer: '',
            socket: socket,
            isRegistered: false,
            type: type
        };

        this.clients.push(tcpClient);

        if (type === 'tracker') {
            this.registerClient(tcpClient, 'Tracking-Server');
        }

        socket.on('data', (data) => {
            this.handleSocketData(tcpClient, data);
        });

        socket.on('error', (error) => {
            this.handleSocketError(tcpClient, error);
        });

        socket.on('end', () => {
            this.handleSocketDisconnect(tcpClient);
        });
    }

    private registerClient(client: TcpClient, name: string) {
        client.name = name;
        this.logDebug(`Unity client ${client.socket.remoteAddress} registered with name: ${client.name}`);
        this.postMessage('clientConnected$', { name: client.name, type: client.type });
    }

    private handleSocketData(client: TcpClient, data: Buffer): void {
        const msgs = this.splitJson(data.toString(), client);

        for (const msg of msgs) {
            try {
                const packet = JSON.parse(msg);
                if (packet.channel === NC_REGISTRATION) {
                    this.registerClient(client, packet.payload);
                }
                this.postMessage('debugIncoming$', { channel: packet.channel, size: msg.length });
                this.postMessage('clientMessage$', { name: client.name, packet: packet });
            } catch (err) {
                this.logError(err.message);
                this.logError(msg);
            }
        }
    }


    private handleSocketError(client: TcpClient, error: Error): void {
        this.logError(error.message);
        this.handleSocketDisconnect(client);
    }

    private handleSocketDisconnect(client: TcpClient): void {
        this.logDebug(`Unity client ${client.name} (${client.address}) disconnected`);
        _.pull(this.clients, client);
        this.postMessage('clientDisconnected$', { name: client.name });
    }


    private handleHeartbeat() {
        for (const client of this.clients) {
            client.socket.write('\0\0\0h\0');
        }
    }




    // adapted from http://stackoverflow.com/a/18729931
    private toUTF8Array(str: string): number[] {
        const utf8: number[] = [];

        for (let i = 0; i < str.length; i++) {
            let charcode = str.charCodeAt(i);
            if (charcode < 0x80) { utf8.push(charcode); } else if (charcode < 0x800) {
                // tslint:disable-next-line:no-bitwise
                utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
            } else if (charcode < 0xd800 || charcode >= 0xe000) {
                // tslint:disable-next-line:no-bitwise
                utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
            } else {
                i++;
                // UTF-16 encodes 0x10000-0x10FFFF by
                // subtracting 0x10000 and splitting the
                // 20 bits of 0x0-0xFFFFF into two halves
                // tslint:disable-next-line:no-bitwise
                charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
                // tslint:disable-next-line:no-bitwise
                utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
            }
        }
        return utf8;
    }




    // TODO: breaks easily, but sufficient for current purpose
    // TODO: see equivalent implementation in unity listener InteractiveSurfaceClient.cs
    private splitJson(text: string, client: TcpClient): string[] {
        const jsonPackets: string[] = [];

        let leftBracketIndex = -1;
        let rightBracketIndex = -1;

        let bracketCounter = 0;
        let startPos = 0;

        const fullText = client.leftOverBuffer ? client.leftOverBuffer + text : text;

        for (let i = 0; i < fullText.length; i++) {
            const ch = fullText.charAt(i);

            if (ch === '{') {
                if (bracketCounter === 0) {
                    leftBracketIndex = i;
                }

                bracketCounter++;
            } else if (ch === '}') {
                bracketCounter--;

                if (bracketCounter <= 0) {
                    rightBracketIndex = i;
                    bracketCounter = 0;

                    jsonPackets.push(fullText.substring(leftBracketIndex, rightBracketIndex + 1));
                    startPos = i + 1;
                }
            }
        }

        if (startPos < fullText.length) {
            client.leftOverBuffer = fullText.substring(startPos);
        } else {
            client.leftOverBuffer = '';
        }

        return jsonPackets;
    }
}


if (!threads.isMainThread) {
    const server = new UnityServerWorker();
}

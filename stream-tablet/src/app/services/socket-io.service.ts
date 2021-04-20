import { Injectable } from '@angular/core';
import { WebClient } from '@stream/models';

import * as io from 'socket.io-client';
import * as _ from 'lodash';

export type SocketMessageHandler = (cmd: string, payload: any) => void;

const DISCONNECT_TIMEOUT_MS = 5 * 1000;

@Injectable({
    providedIn: 'root'
})
export class SocketIO {
    private socket: SocketIOClient.Socket = undefined;
    private subscriptions: { [channel: number]: SocketMessageHandler[]; } = {};

    constructor() {
        this.socket = io.connect({ query: `name=${WebClient.Instance.name}` });
        let hasDisconnected = false;
        let disconnectTime = 0;


        this.socket.on('cmd', msg => {
            if (this.subscriptions[msg.channel]) {
               for (const fn of this.subscriptions[msg.channel]) {
                   fn(msg.command, msg.payload);
               }
            }
        });

        this.socket.on('disconnect', () => {
            hasDisconnected = true;
            disconnectTime = new Date().getTime();
        });
        this.socket.on('connect', () => {
            const timeBetweenConnections = new Date().getTime() - disconnectTime;
            if (hasDisconnected && timeBetweenConnections > DISCONNECT_TIMEOUT_MS) {
                this.socket.disconnect();
                location.reload();
            }
        });
    }

    public on(name: number, onMsgReceived: SocketMessageHandler): void {
        if (!this.subscriptions[name]) {
            this.subscriptions[name] = [];
        }

        this.subscriptions[name].push(onMsgReceived);
    }

    public off(name: number, onMsgReceived: SocketMessageHandler): void {
        _.pull(this.subscriptions[name], onMsgReceived);
    }

    public get connected(): boolean {
        return this.socket.connected;
    }

    public send(channel: number, command: string, data: any): void {
        this.socket.emit('cmd', {
            channel: channel,
            command: command,
            payload: data
        });
    }
}

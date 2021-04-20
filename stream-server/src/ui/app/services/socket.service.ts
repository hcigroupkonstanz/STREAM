import { Injectable, NgZone } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import * as _ from 'lodash';
import * as io from 'socket.io-client';

@Injectable({
    providedIn: 'root'
})
export class SocketIOService {
    private socket: SocketIOClient.Socket;
    private listeners: { [name: string]: Subject<any> } = {};
    private triggerAngularChanges: Function;

    constructor(private zone: NgZone) {
        this.socket = io.connect();
        this.triggerAngularChanges = _.throttle(() => this.zone.run(() => {}), 100);
    }


    public listen(channel: string): Observable<any> {
        if (!this.listeners[channel]) {
            const msgStream = new Subject<any>();
            this.listeners[channel] = msgStream;

            this.socket.on(channel, msg => {
                msgStream.next(msg);
                this.triggerAngularChanges();
            });
        }

        return this.listeners[channel].asObservable();
    }


    public execute(input: string): void {
        this.socket.emit('command', input);
    }

    public evaluate(input: string): void {
        this.socket.emit('evaluate', input);
    }
}

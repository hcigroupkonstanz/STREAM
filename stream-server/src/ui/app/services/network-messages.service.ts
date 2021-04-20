import * as _ from 'lodash';
import { Injectable } from '@angular/core';
import { SocketIOService } from './socket.service';
import { filter } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NetworkMessagesService {

    public readonly outSocketIoMessages = {};
    public readonly outUnityMessages = {};

    public readonly inUnityArMessages = {};
    public readonly inUnityTrackingMessages = {};
    public readonly inSocketIoMessages = {};


    public readonly bandwidthIncUnity: BehaviorSubject<number> = new BehaviorSubject(0);
    public readonly bandwidthOutUnity: BehaviorSubject<number> = new BehaviorSubject(0);
    public readonly bandwidthIncSocketIo: BehaviorSubject<number> = new BehaviorSubject(0);
    public readonly bandwidthOutSocketIo: BehaviorSubject<number> = new BehaviorSubject(0);


    constructor(socket: SocketIOService) {
        socket.listen('network')
            .pipe(filter(msg => msg.type === 'count'))
            .subscribe(msg => {
                this.handleMsg(msg, 'unity-out', this.outUnityMessages);
                this.handleMsg(msg, 'unity-ar-in', this.inUnityArMessages);
                this.handleMsg(msg, 'unity-tracking-in', this.inUnityTrackingMessages);
                this.handleMsg(msg, 'socketio-out', this.outSocketIoMessages);
                this.handleMsg(msg, 'socketio-in', this.inSocketIoMessages);
            });


        socket.listen('network')
            .pipe(filter(msg => msg.type === 'bandwidth'))
            .subscribe(msg => {
                this.handleBandwidthMsg(msg, 'unity-outgoing', this.bandwidthOutUnity);
                this.handleBandwidthMsg(msg, 'unity-incoming', this.bandwidthIncUnity);
                this.handleBandwidthMsg(msg, 'socketio-outgoing', this.bandwidthOutSocketIo);
                this.handleBandwidthMsg(msg, 'socketio-incoming', this.bandwidthIncSocketIo);
            });
    }

    private handleMsg(msg: any, source: string, counter: any) {
        if (msg.source === source) {
            const msgs = _.keys(msg.messages).map(k => {
                return {
                    channel: k,
                    count: msg.messages[k]
                };
            });

            for (const m of msgs) {
                counter[m.channel] = m.count;
            }
        }
    }

    private handleBandwidthMsg(msg: any, source: string, counter: BehaviorSubject<number>) {
        if (msg.source === source) {
            counter.next(msg.size / 1000);
        }
    }
}

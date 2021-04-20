import { AdminSocketIoServer } from './admin-socket-io';
import { sampleTime, tap, map } from 'rxjs/operators';
import { SocketIOServer } from '../web-clients';
import { UnityServerProxy } from '../unity';
import { Service } from '../core';
import { Observable, interval } from 'rxjs';

export class MsgCounter extends Service {
    public serviceName = 'MsgCounter';
    public groupName = 'gui';

    constructor(
        private socket: AdminSocketIoServer,
        unityServer: UnityServerProxy,
        socketServer: SocketIOServer) {
        super();

        this.countMsgs(unityServer.outgoing$.pipe(map(msg => msg.channel)), 'unity-out');
        this.countMsgs(socketServer.outgoing$.pipe(map(msg => msg.channel)), 'socketio-out');

        this.countMsgs(unityServer.arMessages$.pipe(map(msg => msg.channel)), 'unity-ar-in');
        this.countMsgs(unityServer.trackingMessages$.pipe(map(msg => msg.channel)), 'unity-tracking-in');
        this.countMsgs(socketServer.messages$.pipe(map(msg => msg.channel)), 'socketio-in');


        this.countTraffic(unityServer.outgoing$.pipe(map(msg => msg.size)), 'unity-outgoing');
        this.countTraffic(unityServer.incoming$.pipe(map(msg => msg.size)), 'unity-incoming');
        this.countTraffic(socketServer.outgoing$.pipe(map(msg => msg.size)), 'socketio-outgoing');
        this.countTraffic(socketServer.incoming$.pipe(map(msg => msg.size)), 'socketio-incoming');
    }

    private countMsgs(outgoing$: Observable<number>, name: string) {
        const updateFrequencyMs = 500;
        const msgs = {};

        outgoing$
            .pipe(
                tap(channel => {
                    if (!msgs[channel]) {
                        msgs[channel] = 0;
                    }
                    msgs[channel]++;
                }),
                sampleTime(updateFrequencyMs))
            .subscribe(channel => this.socket.sendMessage('network', {
                type: 'count',
                source: name,
                messages: msgs
            }));
    }

    private countTraffic(stream: Observable<number>, name: string) {
        const updateFrequencyMs = 1000;
        let counter = 0;

        stream.subscribe(size => counter += size);

        interval(updateFrequencyMs)
            .subscribe(() => {
                this.socket.sendMessage('network', {
                    type: 'bandwidth',
                    source: name,
                    size: counter
                });
                counter = 0;
            });
    }
}

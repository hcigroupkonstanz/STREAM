import { AdminSocketIoServer } from './admin-socket-io';
import * as _ from 'lodash';
import { Service, LogMessage } from '../core';
import { merge } from 'rxjs';
import { takeWhile, bufferTime, switchMap, filter } from 'rxjs/operators';

export class LogOutput extends Service {
    public get serviceName(): string { return 'LogOutput'; }
    public get groupName(): string { return 'gui'; }

    private logMessages: any[] = [];

    public constructor(private adminServer: AdminSocketIoServer) {
        super();

        this.adminServer.clientConnected$
        .subscribe(c => {
            c.emit('log', this.logMessages);
        });


        Service.Outputs$.pipe(
            takeWhile(() => !this.adminServer.isRunning)
        ).subscribe(log => {
            console.log(`[${log.created.toISOString()}] ${log.message}`);
        });

        Service.Outputs$.pipe(
            bufferTime(100),
            filter(logs => logs.length > 0)
        ).subscribe(logs => {
            const webMsgs = [];
            for (const log of logs) {
                const similarMsg = _.find(webMsgs, m => m.message === log.message);
                if (similarMsg) {
                    similarMsg.count += 1;
                } else {
                    while (this.logMessages.length > 1000) {
                        this.logMessages.shift();
                    }

                    const webMsg = this.toWebMsg(log);
                    this.logMessages.push(webMsg);
                    webMsgs.push(webMsg);
                }
            }

            this.adminServer.sendMessage('log', webMsgs);
        });
    }

    private toWebMsg(log: LogMessage): any {
        return {
            origin: log.origin,
            level: log.level,
            group: log.group,
            message: log.message,
            created: log.created.getTime(),
            count: 1
        };
    }
}

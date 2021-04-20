import { Injectable } from '@angular/core';
import { SocketIOService } from './socket.service';
import { Observable } from 'rxjs';

export const enum LogLevel {
    Error,
    Warn,
    Info,
    Debug
}

export interface LogMessage {
    origin: string;
    level: LogLevel;
    message: string;
    group: string;
    created: Date;
    count: number;
}


export interface GroupedLogMessage extends LogMessage {
    id: number;
}

@Injectable({
    providedIn: 'root'
})
export class LogService {
    public messages: GroupedLogMessage[] = [];
    public updates$: Observable<void>;

    constructor(socket: SocketIOService) {
        let idCounter = 0;
        this.updates$ = socket.listen('log');

        socket
            .listen('log')
            .subscribe((ms: GroupedLogMessage[]) => {
                for (const m of ms) {
                    let foundSimilarMsg = false;
                    // search last few messages for identical messages, group them together
                    for (let i = 0; i < this.messages.length && i < 10; i++) {
                        if (this.messages[i].message === m.message) {
                            foundSimilarMsg = true;
                            this.messages[i].count += m.count;
                            this.messages[i].created = m.created;
                            const existingMsg = this.messages[i];
                            this.messages.splice(i, 1);
                            this.messages.unshift(existingMsg);
                            break;
                        }
                    }

                    if (!foundSimilarMsg) {
                        while (this.messages.length > 300) {
                            this.messages.pop();
                        }

                        m.id = idCounter;
                        idCounter++;
                        this.messages.unshift(m);
                    }
                }
            });
    }
}

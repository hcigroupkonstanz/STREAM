import { filter } from 'rxjs/operators';
import { Service, NC_LOG } from '../core';
import { SocketIOServer } from './socketio-server';

export class WebClientLogger extends Service {
    public get serviceName(): string { return 'WebClientLogger'; }
    public get groupName(): string { return 'tangibles'; }

    public constructor(private socketServer: SocketIOServer) {
        super();

        socketServer.messages$
            .pipe(filter(m => m.channel === NC_LOG))
            .subscribe(m => {
                switch (m.command) {

                case 'info':
                    this.logInfo(`[${m.origin.name}] ${m.payload}`);
                    break;

                case 'warning':
                    this.logWarning(`[${m.origin.name}] ${m.payload}`);
                    break;

                case 'error':
                    this.logError(`[${m.origin.name}] ${m.payload}`, false);
                    break;

                case 'debug':
                default:
                    this.logDebug(`[${m.origin.name}] ${m.payload}`);
                    break;

                }
            });
    }
}

import { Logger } from './logger.service';
import { Injectable } from '@angular/core';
import { SocketIO } from './socket-io.service';
import { ArClient, NC_ARCLIENT } from '@stream/models';
import { BehaviorSubject, Subject } from 'rxjs';
import { auditTime, share } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class OwnerService {

    public readonly CurrentOwner: BehaviorSubject<ArClient> = new BehaviorSubject<ArClient>(null);

    private readonly anyUpdateStream = new Subject<void>();
    public readonly anyUpdates$ = this.anyUpdateStream.pipe(
        auditTime(1),
        share()
    );

    constructor(
        private socketio: SocketIO,
        private logger: Logger) {

        socketio.send(NC_ARCLIENT, 'request', null);

        socketio.on(NC_ARCLIENT, (cmd, payload) => {
            if (cmd === 'update' || cmd === 'request') {
                if (payload === null) {
                    this.CurrentOwner.next(null);
                } else if (this.CurrentOwner.value === null || this.CurrentOwner.value.id !== payload.id) {
                    if (this.CurrentOwner.value !== null) {
                        this.CurrentOwner.value.destroy();
                    }

                    const owner = new ArClient();
                    owner.remoteUpdate(payload);
                    owner.localModelChanges$.subscribe(changes => {
                        this.socketio.send(NC_ARCLIENT, 'update', owner.toJson(changes));
                    });
                    this.CurrentOwner.next(owner);

                    // for debugging
                    (<any>window).owner = owner;
                } else {
                    this.CurrentOwner.value.remoteUpdate(payload);
                }

                this.anyUpdateStream.next();
            } else {
                logger.warn(`Unknown command ${cmd} for arclient channel`);
            }
        });
    }
}

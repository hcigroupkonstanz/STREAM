import { Logger } from './logger.service';
import { SocketIO } from './socket-io.service';
import { Injectable } from '@angular/core';
import { Tracker, NC_TRACKER } from '@stream/models';

import * as _ from 'lodash';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TrackerService {
    public readonly trackers: Tracker[] = [];

    private readonly remoteUpdateStream = new Subject<{ model: Tracker, changes: string[]}>();
    public readonly remoteUpdates$ = this.remoteUpdateStream.asObservable();

    constructor(
        private socketio: SocketIO,
        private logger: Logger) {
        this.initialize();

        window['trackers'] = this.trackers;
    }

    private initialize() {
        this.socketio.send(NC_TRACKER, 'request', null);

        this.socketio.on(NC_TRACKER, (cmd, payload) => {
            switch (cmd) {
                case 'request':
                    for (const tracker of payload) {
                        this.trackers.push(tracker);
                    }
                    break;

                case 'add':
                    this.trackers.push(payload as Tracker);
                    break;

                case 'update':
                    const remoteTracker = payload as Tracker;
                    const localTracker = _.find(this.trackers, { id: remoteTracker.id });
                    if (!localTracker) {
                        this.trackers.push(remoteTracker);
                        this.logger.warn(`Adding unknown tracker ${remoteTracker.hardwareId} instead of updating...`);
                    } else {
                        for (const key of _.keys(remoteTracker)) {
                            localTracker[key] = remoteTracker[key];
                        }
                        this.remoteUpdateStream.next({ model: localTracker, changes: _.keys(remoteTracker) });
                    }
                    break;

                case 'remove':
                    _.remove(this.trackers, { id: payload as number });
                    break;

                default:
                    this.logger.warn(`Unknown command ${cmd} for tracker`);
                    break;
            }
        });
    }
}

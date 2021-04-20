import { filter, mapTo, flatMap } from 'rxjs/operators';

import { Service, NC_TRACKER } from '../core';
import { UnityServerProxy } from '../unity';
import { Manager } from '../database';
import { Tracker } from './tracker';
import { SocketIOServer } from '../web-clients';

export class TrackerListener extends Service {
    public get serviceName(): string { return 'TrackerListener'; }
    public get groupName(): string { return 'tracking'; }

    public constructor(
        private unityServer: UnityServerProxy,
        private socketio: SocketIOServer,
        private trackerManager: Manager<Tracker>) {

        super();

        trackerManager.modelChanges$.pipe(
            filter(ev => ev.changes.indexOf('name') >= 0)
        ).subscribe(ev => {
            unityServer.broadcast({
                channel: NC_TRACKER,
                command: 'update',
                payload: ev.model.toJson(ev.changes)
            }, unityServer.currentTrackerClients);
        });

        unityServer.trackingMessages$
            .pipe(filter(m => m.channel === NC_TRACKER))
            .subscribe(m => this.handleTrackerUpdate(m.command, m.payload, m.origin));

        socketio.messages$
            .pipe(filter(m => m.channel === NC_TRACKER))
            .subscribe(m => {
                if (m.command === 'request') {
                    socketio.send(m.origin, {
                        channel: NC_TRACKER,
                        command: 'request',
                        payload: this.trackerManager.loadedEntries.map(t => t.toJson())
                    });
                } else {
                    this.logWarning(`Unknown command ${m.command} from SocketIO in 'tracker' channel`);
                }
            });

        unityServer.arMessages$
            .pipe(filter(m => m.channel === NC_TRACKER))
            .subscribe(m => {
                if (m.command === 'request') {
                    unityServer.broadcast({
                        channel: NC_TRACKER,
                        command: 'request',
                        payload: this.trackerManager.loadedEntries.map(t => t.toJson())
                    }, [m.origin]);
                } else {
                    this.logWarning(`Unknown command ${m.command} from UnityServer in NC_TRACKER channel`);
                }
            });


        // deactivate all trackers once the tracker unity client has disconnected
        unityServer.clientsRemoved$
            .pipe(
                filter(c => c.type === 'tracker'),
                mapTo(trackerManager.loadedEntries),
                flatMap(t => t)
            )
            .subscribe(tracker => tracker.isActive = false);
    }

    private async handleTrackerUpdate(command: string, payload: any, source: any) {
        switch (command) {
            case 'add':
                const tracker = await this.trackerManager.get({
                    hardwareId: payload.hardwareId
                }, true).toPromise();
                tracker.hardwareId = payload.hardwareId;
                tracker.update(payload, source);
                this.logDebug(`New tracker ${payload.hardwareId} (${tracker.id})`);

                // send back ID
                this.unityServer.broadcast({
                    channel: NC_TRACKER,
                    command: 'add',
                    payload: tracker.toJson()
                }, this.unityServer.currentTrackerClients);
                break;

            case 'request':
                this.unityServer.broadcast({
                    channel: NC_TRACKER,
                    command: 'request',
                    payload: this.trackerManager.loadedEntries.map(t => t.toJson())
                }, [source]);
                break;

            case 'update':
                this.updateTracker(payload, source);
                break;

            case 'remove':
                this.removeTracker(payload);
                this.logDebug(`Removed tracker ${payload}`);
                break;

            default:
                this.logError(`Unknown command ${command}`, false);
        }
    }

    private updateTracker(payload: any, source: any): void {
        let tracker = this.trackerManager.findLoadedEntry({ id: payload.id });

        if (!tracker) {
            tracker = this.trackerManager.findLoadedEntry({ hardwareId: payload.hardwareId });
        }

        if (tracker) {
            tracker.update(payload, source);
        } else {
            this.logWarning(`Cannot update tracker ${payload.id}: No such entry`);
        }
    }

    private removeTracker(hardwareId: string): void {
        const tracker = this.trackerManager.findLoadedEntry({ hardwareId: hardwareId });

        if (tracker === undefined) {
            this.logWarning(`Cannot deactivate tracker ${hardwareId}: No such entry`);
        } else {
            tracker.isActive = false;
        }
    }
}

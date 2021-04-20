import { Service } from '../core';
import { Manager } from '../database';
import { AdminSocketIoServer } from '../gui';
import { UnityServerProxy } from '../unity';
import { Tracker } from './tracker';
import { OriginPoint } from './origin-point';


export class TrackerCommands extends Service {
    public get serviceName(): string { return 'Terminal:Trackers'; }
    public get groupName(): string { return 'gui'; }

    public constructor(
        private admin: AdminSocketIoServer,
        private trackers: Manager<Tracker>,
        private origin: Manager<OriginPoint>,
        private unityServer: UnityServerProxy) {
        super();

        admin.registerCommand('tracker', args => this.onTrackerCommand(args));
        admin.registerCommand('trackers', args => this.onTrackerCommand(args));
    }

    private onTrackerCommand(args: string[]): void {
        if (args.length === 0) {
            this.logWarning('Available commands: name, calibrate');
            return;
        }

        switch (args[0]) {
            case 'name':
                this.renameClient(args);
                break;

            case 'origin':
                this.setOrigin(args);
                break;

            default:
                this.logWarning(`Unknown command ${args[0]}`);
                break;
        }
    }


    private renameClient(args: string[]): void {
        if (args.length !== 3) {
            this.logInfo(`Expected 3 arguments (name <id> <name>), got ${args.length}`);
            return;
        }

        const id = args[1];
        const newName = args[2];

        this.trackers.get({ id: id }, false)
            .subscribe(entry => {
                if (!entry) {
                    this.logWarning(`Unable to find tracker with id ${id}`);
                } else {
                    this.logInfo(`Changing name from ${entry.name} to ${newName}`);
                    entry.name = newName;
                }
            });
    }

    private async setOrigin(args: string[]) {
        if (args.length !== 3) {
            this.logInfo(`Expected 3 arguments (calibrate <1/2> <id>), got ${args.length}`);
            return;
        }

        const index = Number(args[1]);
        const tracker = await this.trackers.get({ id: Number(args[2]) }).toPromise();
        const origin = await this.origin.get({ id: index }, true).toPromise();

        if (!tracker || !origin) {
            this.logError(`Unable to set origin point`);
        }

        origin.position = tracker.position;
        origin.rotation = tracker.rotation;
    }
}

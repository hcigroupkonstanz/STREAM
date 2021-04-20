import { Service } from '../core';
import { Manager } from '../database';
import { AdminSocketIoServer } from '../gui';

import { UnityServerProxy } from './unity-server-proxy';
import { UnityClient } from './unity-client';

export class UnityClientCommands extends Service {
    public get serviceName(): string { return 'Terminal:UnityClients'; }
    public get groupName(): string { return 'gui'; }

    public constructor(
        private admin: AdminSocketIoServer,
        private unityClients: Manager<UnityClient>,
        private unityServer: UnityServerProxy) {
        super();

        admin.registerCommand('unityclient', args => this.onUnityClientCommand(args));
        admin.registerCommand('unityclients', args => this.onUnityClientCommand(args));
    }

    private onUnityClientCommand(args: string[]): void {
        if (args.length === 0) {
            this.logWarning('Available commands: name, list, listall, calibrate');
            return;
        }

        switch (args[0]) {
            case 'name':
                this.renameClient(args);
                break;

            case 'list':
                this.listClients(true);
                break;

            case 'listall':
                this.listClients(false);
                break;

            case 'calibrate':
                this.calibrateClient(args);
                break;

            case 'debug':
                this.toggleDebug(args);
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

        this.unityClients.get({ id: id }, false)
            .subscribe(entry => {
                if (!entry) {
                    this.logWarning(`Unable to find client with id ${id}`);
                } else {
                    this.logInfo(`Changing name from ${entry.name} to ${newName}`);
                    entry.name = newName;
                }
            });
    }

    private async listClients(listOnlyActive: boolean) {
        let clients: UnityClient[] = [];

        if (listOnlyActive) {
            clients = <UnityClient[]>this.unityServer.currentClients;
        } else {
            clients = this.unityClients.loadedEntries;
        }

        if (clients.length === 0) {
            this.logInfo('No unity clients available');
        } else {
            this.logInfo('ID\tName\ttype');
            this.logInfo('-------------------');
            for (const client of clients) {
                this.logInfo(`${client.id}\t${client.name}\t${client.type}`);
            }
        }
    }

    private calibrateClient(args: string[]) {
        if (args.length !== 2) {
            this.logInfo(`Expected 2 arguments (calibrate <id>), got ${args.length}`);
            return;
        }

        const client = this.unityClients.findLoadedEntry({ id: args[1] });
        if (!client) {
            this.logWarning(`Unable to find client ${args[1]}, client must be connected to this server`);
        } else {
            client.isCalibrating = !client.isCalibrating;
        }
    }

    private toggleDebug(args: string[]) {
        const client = this.unityClients.findLoadedEntry({ id: args[1] });
        if (!client) {
            this.logWarning(`Unable to find client ${args[1]}, client must be connected to this server`);
        } else {
            client.debugIndicators = !client.debugIndicators;
        }
    }
}

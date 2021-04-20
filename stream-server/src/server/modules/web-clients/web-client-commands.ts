import { NC_CONTROL } from './../core/network-channel';
import { Service } from '../core';
import { Manager } from '../database';
import { AdminSocketIoServer } from '../gui';

import { SocketIOServer } from './socketio-server';
import { WebClient } from './web-client';

export class WebClientCommands extends Service {
    public get serviceName(): string { return 'Terminal:WebClients'; }
    public get groupName(): string { return 'gui'; }

    public constructor(
        private admin: AdminSocketIoServer,
        private webclientManager: Manager<WebClient>,
        private socketServer: SocketIOServer) {
        super();

        admin.registerCommand('webclient', args => this.onWebClientCommand(args));
        admin.registerCommand('webclients', args => this.onWebClientCommand(args));
    }

    private onWebClientCommand(args: string[]): void {
        if (args.length === 0) {
            this.logInfo('Available commands: name, list, listall, calibrate');
            return;
        }

        switch (args[0]) {
            case 'restart':
                this.restartClient(Number(args[1]));
                break;

            case 'name':
                this.renameClient(args);
                break;

            case 'calibrate':
                this.calibrateClient(Number(args[1]));
                break;

            case 'settings':
                this.toggleClientSettings(Number(args[1]));
                break;

            default:
                this.logWarning(`Unknown command ${args[0]}`);
                break;
        }
    }

    private async restartClient(id: number) {
        const client = await this.webclientManager.get({ id: id }).toPromise();
        if (client) {
            this.socketServer.send(client, {
                channel: NC_CONTROL,
                command: 'restart',
                payload: {}
            });
        }
    }


    private calibrateClient(id: number) {
        this.webclientManager.get({ id: id })
            .subscribe(client => {
                for (const c of this.webclientManager.loadedEntries) {
                    if (c !== client) {
                        c.isCalibrating = false;
                    }
                }
                client.isCalibrating = !client.isCalibrating;
            });
    }

    private async toggleClientSettings(id: number) {
        const client = await this.webclientManager.get({ id: id }).toPromise();
        if (client.screenMenu.selectedMenu === 'settings') {
            client.screenMenu = { selectedMenu: '', options: [] };
        } else {
            client.screenMenu = { selectedMenu: 'settings', options: [] };
        }
    }


    private renameClient(args: string[]): void {
        if (args.length !== 3) {
            this.logWarning(`Expected 3 arguments, got ${args.length}`);
            return;
        }

        const id = args[1];
        const newName = args[2];

        this.webclientManager.get({ id: id }, false)
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
        let clients: WebClient[] = [];

        if (listOnlyActive) {
            clients = <WebClient[]>this.socketServer.currentClients;
        } else {
            clients = this.webclientManager.loadedEntries;
        }

        if (clients.length === 0) {
            this.logInfo('No webclients available');
        } else {
            this.logInfo('ID\tName');
            this.logInfo('-------------------');
            for (const client of clients) {
                this.logInfo(`${client.id}\t${client.name}`);
            }
        }
    }
}

import { Service } from '../core';
import { Manager } from '../database';
import { AdminSocketIoServer } from '../gui';
import { Link } from './link';
import { Plot } from './plot';

export class PlotCommands extends Service {
    public get serviceName(): string { return 'Terminal:WebClients'; }
    public get groupName(): string { return 'gui'; }

    public constructor(
        private admin: AdminSocketIoServer,
        private plots: Manager<Plot>,
        private links: Manager<Link>) {
        super();

        admin.registerCommand('plot', args => this.onPlotCommand(args));
        admin.registerCommand('plots', args => this.onPlotCommand(args));

        admin.registerCommand('link', args => this.onLinkCommands(args));
        admin.registerCommand('links', args => this.onLinkCommands(args));
    }

    private onPlotCommand(args: string[]): void {
        if (args.length === 0) {
            this.logInfo('Invalid');
            return;
        }

        switch (args[0]) {
            case 'delete':
                this.deletePlot(Number(args[1]));
                break;

            default:
                this.logWarning(`Unknown command ${args[0]}`);
                break;
        }
    }


    private deletePlot(id: number): void {
        this.plots.delete(id);
    }



    private onLinkCommands(args: string[]): void {
        if (args.length === 0) {
            this.logInfo('Invalid');
            return;
        }

        switch (args[0]) {
            case 'delete':
                this.deleteLink(Number(args[1]));
                break;

            default:
                this.logWarning(`Unknown command ${args[0]}`);
                break;
        }
    }

    private deleteLink(id: number): void {
        this.links.delete(id);
    }
}

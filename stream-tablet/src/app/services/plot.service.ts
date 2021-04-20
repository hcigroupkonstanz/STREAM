import * as _ from 'lodash';
import { Injectable } from '@angular/core';
import { SocketIO } from './socket-io.service';
import { Logger } from './logger.service';
import { Plot, WebClient, NC_PLOT } from '@stream/models';
import { RemoteService } from './remote-service';
import { Subject, merge } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class PlotService extends RemoteService {

    public readonly defaultColors = [
        // material colour palette, see https://material.io/guidelines/style/color.html
        '#F44336', // red
        '#9C27B0', // purple
        '#3F51B5', // indigo
        '#2196F3', // blue
        '#4CAF50', // green
        '#FFEB3B', // yellow
        '#FF9800', // orange
        '#00BCD4', // cyan
    ];

    public readonly plots: Plot[] = [];

    private readonly remoteUpdateStream = new Subject<{ model: Plot, changes: string[]}>();
    public readonly remoteUpdates$ = this.remoteUpdateStream.asObservable();

    private readonly localUpdateStream = new Subject<{ model: Plot, changes: string[]}>();
    public readonly localUpdates$ = this.localUpdateStream.asObservable();

    constructor(
        private socketIO: SocketIO,
        private logger: Logger
    ) {
        super();
        this.initialize();

        // for debugging
        window['plots'] = this.plots;
    }

    private initialize() {
        this.socketIO.send(NC_PLOT, 'request', null);

        this.anyUpdateStream.next();
        this.socketIO.on(NC_PLOT, (cmd, payload) => {
            switch (cmd) {
                case 'request':
                    // clear old plots
                    while (this.plots.length > 0) {
                        const p = this.plots.pop();
                        p.destroy();
                    }

                    for (const p of payload) {
                        this.addPlot(p);
                    }

                    this._initialized.next(true);
                    break;


                case 'add':
                case 'update':
                case 'data':
                    this.updatePlot(payload);
                    break;
                case 'remove':
                    this.removePlot(payload.id);
                    break;
                default:
                    this.logger.error(`Unknown command ${cmd} for plots`);
                    break;
            }
        });
    }

    public create() {
        const lastPlot = _.last(this.plots);
        const lastId = lastPlot ? lastPlot.id : 0;

        this.socketIO.send(NC_PLOT, 'create', {
            boundTo: WebClient.Instance.id,
            color: this.defaultColors[lastId % this.defaultColors.length]
        });
    }

    public async getPlot(id: number): Promise<Plot | null> {
        await this.initialized;
        return _.find(this.plots, p => p.id === id);
    }

    private addPlot(data: any): Plot {
        const plot = new Plot();
        plot.remoteUpdate(data);
        this.plots.push(plot);

        plot.localModelChanges$.subscribe(changes => {
            this.localUpdateStream.next({ model: plot, changes: changes });
            this.socketIO.send(NC_PLOT, 'update', plot.toJson(changes));
            this.anyUpdateStream.next();
        });

        return plot;
    }

    private async updatePlot(data: any): Promise<Plot> {
        const plot = await this.getPlot(data.id);
        if (!plot) {
            return this.addPlot(data);
        } else {
            plot.remoteUpdate(data);
            this.remoteUpdateStream.next({ model: plot, changes: _.keys(data) });
            this.anyUpdateStream.next();
            return plot;
        }
    }

    private removePlot(id: number): void {
        const removed = _.remove(this.plots, p => p.id === id);
        for (const plot of removed) {
            plot.destroy();
        }
        this.anyUpdateStream.next();
    }

    public remove(id: number): void {
        this.removePlot(id);
        this.socketIO.send(NC_PLOT, 'remove', { id: id });
        this.anyUpdateStream.next();
    }
}

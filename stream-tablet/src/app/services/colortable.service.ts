import { NC_COLOR } from './../models/network-channel';
import * as _ from 'lodash';
import * as convert from 'color-convert';
import { Injectable } from '@angular/core';
import { SocketIO } from './socket-io.service';
import { Subject } from 'rxjs';
import { ColorTable } from '@stream/models';
import { Logger } from './logger.service';
import { RemoteService } from './remote-service';

@Injectable({
    providedIn: 'root'
})
export class ColortableService extends RemoteService {

    public readonly colortables: ColorTable[] = [];

    private readonly remoteUpdateStream = new Subject<ColorTable>();
    public readonly remoteUpdates$ = this.remoteUpdateStream.asObservable();

    constructor(
        private socketIO: SocketIO,
        private logger: Logger
    ) {
        super();
        this.initialize();

        // for debugging
        window['colors'] = this.colortables;
    }

    private initialize() {
        this.socketIO.send(NC_COLOR, 'request', null);

        this.socketIO.on(NC_COLOR, (cmd, payload) => {
            this.anyUpdateStream.next();

            switch (cmd) {
                case 'request':
                    // clear old links
                    while (this.colortables.length > 0) {
                        const p = this.colortables.pop();
                    }

                    for (const p of payload) {
                        this.initializeColors(p);
                        this.colortables.push(p);
                    }

                    this._initialized.next(true);
                    break;

                case 'add':
                case 'update':
                    this.updateTable(payload);
                    break;
                case 'remove':
                    this.removeTable(payload.id);
                    break;
                default:
                    this.logger.error(`Unknown command ${cmd} for colors`);
                    break;
            }
        });
    }

    public async getColors(plotId: number): Promise<ColorTable | null> {
        await this.initialized;
        return _.find(this.colortables, t => t.plotIds && t.plotIds.indexOf(plotId) >= 0);
    }

    private updateTable(update: ColorTable): void {
        const table = _.find(this.colortables, t => t.id === update.id);
        if (!table) {
            this.colortables.push(update);
            this.initializeColors(update);
            this.remoteUpdateStream.next(update);
        } else {
            table.colors = update.colors;
            table.plotIds = update.plotIds;
            this.initializeColors(table);
            this.remoteUpdateStream.next(update);
        }

    }

    private removeTable(tableId: number): void {
        _.remove(this.colortables, ct => ct.id === tableId);
    }

    private initializeColors(table: ColorTable): void {
        const htmlColors: string[] = [];
        for (const c of table.colors) {
            // invert saturation (white -> black) due to white BG
            const hsl = convert.rgb.hsl([c[0], c[1], c[2]]);
            hsl[2] = 100 - hsl[2];
            // reduce strength of black transparent lines
            const rgb = convert.hsl.rgb(hsl);
            const alpha = c[3] / 255;
            const whiteOffset = 350;
            rgb[0] = Math.min(255, rgb[0] + (1 - alpha) * whiteOffset);
            rgb[1] = Math.min(255, rgb[1] + (1 - alpha) * whiteOffset);
            rgb[2] = Math.min(255, rgb[2] + (1 - alpha) * whiteOffset);

            htmlColors.push('#' + convert.rgb.hex(rgb));
        }
        table.htmlColors = htmlColors;
    }
}

import * as _ from 'lodash';
import { WebClient, Plot, ArClient, ScreenMenuItem, NC_VOICE, NC_CONTROL } from '@stream/models';
import { Injectable } from '@angular/core';
import { LinkService } from './link.service';
import { OwnerService } from './owner.service';
import { PlotService } from './plot.service';
import { Logger } from './logger.service';
import { Subject, BehaviorSubject } from 'rxjs';
import { delay, share, filter, ignoreElements } from 'rxjs/operators';
import { SocketIO } from './socket-io.service';

@Injectable({
    providedIn: 'root'
})
export class ActionsService {

    private owner: ArClient;
    private actionSubject = new Subject<string>();
    public actions$ = this.actionSubject.pipe(
        delay(1),
        share()
    );

    public readonly ignoreTouch = new BehaviorSubject<boolean>(false);

    constructor(
        private linkService: LinkService,
        private ownerService: OwnerService,
        private plotService: PlotService,
        private logger: Logger,
        private socketIO: SocketIO
    ) {
        this.ownerService.CurrentOwner.subscribe(v => this.owner = v);
        socketIO.on(NC_VOICE, (cmd, data) => {
            if (cmd === 'cmd') {
                if (data && data.action) {
                    this.triggerAction(data.action, data.metadata, 'voice');
                }
            } else {
                console.warn('Unknown command on voice channel: ' + cmd);
            }
        });


        // disable touch for some time after voice has been activated (to avoid accidental taps etc)
        const tablet = WebClient.Instance;
        let touchTimer = null;
        tablet.modelChanges$
            .pipe(filter(c => c.indexOf('isVoiceActive') >= 0))
            .subscribe(() => {
                if (tablet.isVoiceActive) {
                    this.ignoreTouch.next(true);
                    clearTimeout(touchTimer);
                } else {
                    clearTimeout(touchTimer);
                    touchTimer = setTimeout(() => {
                        this.ignoreTouch.next(false);
                    }, 400);
                }

            });

        (<any>window).actions = this;
    }


    public triggerTouch(action: string, metadata: any, force = false) {
        if (!this.ignoreTouch.value || force) {
            this.triggerAction(action, metadata, 'touch');
        }
    }


    private triggerAction(action: string, metadata: any, source: 'touch' | 'voice') {
        if (action === 'none') {
            return;
        }

        if (metadata && metadata.disabled) {
            return;
        }

        if (!this.owner) {
            this.logger.error(`Cannot trigger action ${action} without owner!`);
            return;
        }

        const menu = WebClient.Instance.screenMenu;



        // send info to AR user
        let direction = '';
        for (const dir of WebClient.ScreenMenuPositions) {
            if (menu[dir] && (<ScreenMenuItem>menu[dir]).action === action) {
                direction = dir;
                break;
            }
        }
        this.socketIO.send(NC_CONTROL, 'action', {
            dir: direction,
            action: action,
            source: source
        });


        switch (action) {
            case 'back':
                menu.selectedMenu = '';
                menu.selectedMenuArgs = {};
                break;

            case 'link_place':
                this.placeLink(metadata);
                break;

            case 'link_cancel':
                this.deleteLink(metadata);
                break;

            case 'plot_create':
                this.createPlot();
                break;

            case 'plot_create_link':
                this.createLink(metadata);
                break;

            case 'plot_color':
                this.togglePlotColor(metadata);
                break;

            case 'plot_sort':
                this.togglePlotSort(metadata);
                break;

            case 'plot_move':
                this.movePlot(metadata);
                break;

            case 'plot_place':
                this.placePlot(metadata);
                break;

            case 'plot_lock':
                this.lockPlot(metadata);
                break;

            case 'plot_use_filter':
                this.togglePlotFilter(metadata);
                break;

            case 'plot_delete':
                this.deletePlot(metadata);
                break;

            case 'plot_vis':
                menu.selectedMenu = 'plot_vis',
                menu.selectedMenuArgs = { plot: metadata.plot, isUserCreated: true };
                break;

            case 'plot_deselect':
            case 'link_deselect':
                this.deselect();
                break;

            case 'select':
                this.select(metadata);
                break;

            case 'link_delete':
                this.deleteLink(metadata);
                break;

            case 'link_replace':
                this.replaceLink(metadata);
                break;

            case 'link_sort':
                this.toggleLinkSort(metadata);
                break;

            case 'link_color':
                this.toggleLinkColor(metadata);
                break;

            case 'link_invert':
                this.invertLink(metadata);
                break;

            case 'link_vis':
                menu.selectedMenu = 'link_vis',
                menu.selectedMenuArgs = { link: metadata.link, isUserCreated: true };
                break;

            case 'zen_on':
                this.owner.zenMode = true;
                break;

            case 'zen_off':
                this.owner.zenMode = false;
                break;

            default:
                this.logger.error(`Unknown action '${action}'`);
                break;
        }

        this.actionSubject.next(action);
    }


    private createPlot() {
        this.plotService.create();
    }

    private select(metadata: any) {
        this.owner.selectedId = metadata.id;
        this.owner.selectedType = metadata.type;
    }

    private placeLink(metadata: any) {
        const link = _.find(this.linkService.links, l => l.id === metadata.link);

        if (link.downstream === -1) {
            link.downstream = this.owner.lookingAtId;
        } else if (link.upstream === -1) {
            link.upstream = this.owner.lookingAtId;
        }

        link.createdBy = -1;
    }

    private deleteLink(metadata: any) {
        this.linkService.remove(metadata.link);
    }

    private deletePlot(metadata: any) {
        this.plotService.remove(metadata.plot);
    }

    private deselect() {
        this.owner.selectedId = -1;
        this.owner.selectedType = '';
    }


    private togglePlotColor(metadata: any) {
        const plot = _.find(this.plotService.plots, p => p.id === metadata.plot);
        if (plot) {
            plot.useColor = !plot.useColor;
        }
    }

    private togglePlotSort(metadata: any) {
        const plot = _.find(this.plotService.plots, p => p.id === metadata.plot);
        if (plot) {
            plot.useSort = !plot.useSort;
        }
    }

    private movePlot(metadata: any) {
        const plot = _.find(this.plotService.plots, p => p.id === metadata.plot);
        if (plot) {
            plot.boundTo = WebClient.Instance.id;
        }
    }

    private placePlot(metadata: any) {
        const plot = _.find(this.plotService.plots, p => p.id === metadata.plot);
        if (plot) {
            plot.boundTo = -1;
            plot.lockedToAxis = false;
        }
    }

    private lockPlot(metadata: any) {
        const plot = _.find(this.plotService.plots, p => p.id === metadata.plot);
        if (plot) {
            plot.lockedToAxis = true;
        }
    }

    private togglePlotFilter(metadata: any) {
        const plot = _.find(this.plotService.plots, p => p.id === metadata.plot);
        if (plot) {
            plot.useFilter = !plot.useFilter;
        }
    }

    private createLink(metadata: any) {
        const plot = _.find(this.plotService.plots, p => p.id === metadata.plot);
        if (plot) {
            this.linkService.create(plot.id);
        }
    }

    private replaceLink(metadata: any) {
        this.linkService.remove(metadata.other);
        this.placeLink(metadata);
    }

    private toggleLinkSort(metadata: any) {
        const link = _.find(this.linkService.links, l => l.id === metadata.link);
        if (link) {
            link.useSort = !link.useSort;
        }
    }

    private toggleLinkColor(metadata: any) {
        const link = _.find(this.linkService.links, l => l.id === metadata.link);
        if (link) {
            link.useColor = !link.useColor;
        }
    }

    private invertLink(metadata: any) {
        const link = _.find(this.linkService.links, l => l.id === metadata.link);
        if (link) {
            const tmp = link.upstream;
            link.upstream = link.downstream;
            link.downstream = tmp;
        }
    }
}

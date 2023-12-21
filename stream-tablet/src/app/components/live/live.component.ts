import * as _ from 'lodash';
import { OwnerService, PlotService, LinkService, ActionsService } from '@stream/services';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ArClient, ScreenMenuItem, WebClient, Link, Plot } from '@stream/models';
import { Router } from '@angular/router';
import { merge } from 'rxjs';
import { delay, sampleTime, filter } from 'rxjs/operators';
import { Utils } from '@stream/root/utils';
import { untilDestroyed } from '@ngneat/until-destroy';

const MENU_LINK = '/live/menu';
const DEFAULT_PROGRESS_DURATION = 2;
const DEFAULT_LINK_COLOR = '#B0BEC5';
const VOICE_ACTIVE_COLOR = '#8BC34A';
const VOICE_INACTIVE_COLOR = '#BDBDBD';

@Component({
    selector: 'app-live',
    templateUrl: './live.component.html',
    styleUrls: ['./live.component.scss']
})
export class LiveComponent implements OnInit, OnDestroy {

    private currentRoute: [string, number?] = [''];
    private owner: ArClient;

    private selectedType = '';
    private selectedId = -1;

    constructor(
        private linkService: LinkService,
        private ownerService: OwnerService,
        private plotService: PlotService,
        private actionsService: ActionsService,
        private router: Router) { }

    ngOnInit() {
        this.ownerService.CurrentOwner
            .pipe(untilDestroyed(this))
            .subscribe(v => this.owner = v);

        WebClient.Instance.modelChanges$
            .pipe(filter(c => c.indexOf('orientation') >= 0))
            .subscribe(() => this.onOrientationChange());

        merge(
            this.plotService.anyUpdates$,
            this.ownerService.anyUpdates$,
            this.linkService.anyUpdates$,
            this.actionsService.actions$,
            WebClient.Instance.modelChanges$)
            .pipe(untilDestroyed(this), delay(1), sampleTime(30))
            .subscribe(() => this.changeNavigation());

        this.changeNavigation();
    }

    ngOnDestroy() {
        this.clearMenu();
    }


    private onOrientationChange(): void {
        if (!this.owner) {
            return;
        }

        const client = WebClient.Instance;
        const menu = client.screenMenu;

        if (client.orientation === 'vertical') {

            // clear plot / link placement
            for (const link of this.linkService.links) {
                if (link.createdBy === client.owner) {
                    this.linkService.remove(link.id);
                    break;
                }
            }

            for (const plot of this.plotService.plots) {
                if (plot.boundTo === client.id) {
                    plot.boundTo = -1;
                }
            }



            if (this.owner.selectedType === 'plot') {
                if (menu.selectedMenu !== 'plot_vis') {
                    menu.selectedMenu = 'plot_vis';
                    menu.selectedMenuArgs = {
                        plot: this.owner.selectedId
                    };
                }
            } else if (this.owner.selectedType === 'link') {
                if (menu.selectedMenu !== 'link_vis') {
                    menu.selectedMenu = 'link_vis';
                    menu.selectedMenuArgs = {
                        link: this.owner.selectedId
                    };
                }
            }
        } else if (client.orientation === 'horizontal') {
            const isUserCreated = menu.selectedMenuArgs && menu.selectedMenuArgs.isUserCreated;

            if (!isUserCreated) {
                menu.selectedMenu = null;
                menu.selectedMenuArgs = null;
            }
        }

        WebClient.Instance.updateScreenMenu();
    }


    private async changeNavigation() {
        const client = WebClient.Instance;
        const menu = client.screenMenu;


        if (!this.owner || client.owner === -1) {
            this.navigate([MENU_LINK]);
            this.clearMenuExcept(['center']);
            this.clearOptions();

            this.overrideMenu('center', this.getEntry('unassigned'));
            return;
        }


        // selection switch -> reset menu
        const hasSelectionChanges = this.selectedId !== this.owner.selectedId || this.selectedType !== this.owner.selectedType;
        if (hasSelectionChanges) {
            this.selectedId = this.owner ? this.owner.selectedId : -1;
            this.selectedType = this.owner ? this.owner.selectedType : '';
            menu.selectedMenu = null;
            menu.selectedMenuArgs = null;

            // force orientation change event
            if (client.orientation === 'vertical') {
                this.onOrientationChange();
            }
        }


        for (const link of this.linkService.links) {
            if (link.createdBy === client.owner) {
                this.setupLinkPlacementScreen(link);
                this.navigate([MENU_LINK]);
                return;
            }
        }


        for (const plot of this.plotService.plots) {
            if (plot.boundTo === client.id) {

                if (plot.lockedToAxis) {
                    this.clearMenu();
                    this.overrideOptions([{
                        icon: 'lock',
                        action: 'plot_place',
                        actionName: 'Place',
                        voice: 'place',
                        voiceName: `<color=${VOICE_ACTIVE_COLOR}>Place <color=${VOICE_INACTIVE_COLOR}>here`,
                        metadata: {
                            plot: plot.id
                        }
                    }]);

                } else {
                    this.clearMenu();
                    this.overrideOptions([
                        {
                            icon: 'touch_app',
                            action: 'plot_place',
                            actionName: 'Place here',
                            voice: 'place',
                            voiceName: `<color=${VOICE_ACTIVE_COLOR}>Place <color=${VOICE_INACTIVE_COLOR}>here`,
                            metadata: {
                                plot: plot.id
                            }
                        },
                        {
                            icon: 'lock_open',
                            action: 'plot_lock',
                            actionName: 'Lock to alignment',
                            voice: 'lock',
                            voiceName: `<color=${VOICE_ACTIVE_COLOR}>Lock <color=${VOICE_INACTIVE_COLOR}>to alignment`,
                            metadata: {
                                plot: plot.id
                            }
                        }
                    ]);
                }

                this.navigate([`/live/plot/${plot.id}/placement`]);
                return;
            }
        }



        // switch screen takes precedence
        const isHorizontal = client.orientation === 'horizontal' || client.orientation === 'inbetween';
        const isVertical = client.orientation === 'vertical';

        const isHSwitching = (this.owner.selectedId !== this.owner.lookingAtId || this.owner.selectedType !== this.owner.lookingAtType)
            && this.owner.lookingAtId >= 0 && this.owner.selectionProgress >= 0;
        const isVSwitching = (this.owner.selectedId !== client.lookingAtId || this.owner.selectedType !== client.lookingAtType)
            && client.lookingAtId >= 0 && this.owner.selectionProgress >= 0;

        if ((isHorizontal && isHSwitching) || (isVertical && isVSwitching)) {
            this.navigate([MENU_LINK]);
            this.clearMenuExcept(['center']);
            this.clearOptions();

            const icon = this.owner.lookingAtType === 'plot' ? 'scatter_plot' : 'timeline';
            let color = DEFAULT_LINK_COLOR;
            if (this.owner.lookingAtType === 'plot') {
                const plot = await this.plotService.getPlot(this.owner.lookingAtId);
                if (plot) {
                    color = plot.color;
                }
            }

            const entry = this.getEntry('switch', {
                type: this.owner.lookingAtType,
                id: this.owner.lookingAtId,
                color: color
            });
            entry.icon = icon;

            this.overrideMenu('center', entry);
            return;
        }



        if (menu.selectedMenu) {
            menu.hide = true;
            switch (menu.selectedMenu) {
                case 'settings':
                    this.clearOptions();
                    this.clearMenu();
                    this.navigate(['/live/settings']);
                    return;

                case 'plot_vis':
                    this.setupPlotMenu(true);
                    this.navigate([`/live/plot/${menu.selectedMenuArgs.plot}/vis`]);
                    return;

                case 'link_vis':
                    this.setupLinkMenu(true);
                    this.navigate([`/live/link/${menu.selectedMenuArgs.link}/vis`]);
                    return;

                default:
                    console.error(`Unknown selected menu '${menu.selectedMenu}'`);
            }
        } else {
            menu.hide = false;
            client.updateScreenMenu();
        }


        this.navigate([MENU_LINK]);

        if (this.owner.selectedType === 'plot') {
            this.setupPlotMenu(false);
        } else if (this.owner.selectedType === 'link') {
            this.setupLinkMenu(false);
        } else { // nothing selected, nothing being looked at
            if (client.orientation === 'horizontal' || client.orientation === 'inbetween') {

                this.clearMenuExcept(['left', 'right']);
                this.clearOptions();

                this.overrideMenu('left', this.getEntry('plot_create'));
                this.overrideMenu('right', this.getEntry('zen'));
            } else {
                this.navigate([MENU_LINK]);

                this.clearMenuExcept(['center']);
                this.clearOptions();

                this.overrideMenu('center', this.getEntry('vertical_target'));
            }
        }
    }

    private clearMenu(): void {
        this.clearMenuExcept([]);
    }

    private clearMenuExcept(except: string[]): void {
        const menu = WebClient.Instance.screenMenu;
        for (const pos of WebClient.ScreenMenuPositions) {
            if (except.indexOf(pos) < 0) {
                delete menu[pos];
            }
        }
        WebClient.Instance.updateScreenMenu();
    }

    private overrideMenu(pos: string, item: ScreenMenuItem): void {
        const menu = WebClient.Instance.screenMenu;
        const menuItem = <ScreenMenuItem>menu[pos];

        if (!_.isEqual(menuItem, item)) {
            menu[pos] = item;
            WebClient.Instance.updateScreenMenu();
        }
    }

    private clearOptions(): void {
        WebClient.Instance.screenMenu.options = [];
    }

    private overrideOptions(items: ScreenMenuItem[]): void {
        WebClient.Instance.screenMenu.options = items;
        WebClient.Instance.updateScreenMenu();
    }

    private navigate(route: [string, number?]): void {
        let actualRoute = route;

        if (this.owner && this.owner.zenMode && WebClient.Instance.orientation !== 'vertical') {
            actualRoute = ['/live/zen'];
        }

        // settings trumps all
        if (WebClient.Instance.screenMenu.selectedMenu === 'settings') {
            actualRoute = ['/live/settings'];
        }

        if (!_.isEqual(actualRoute, this.currentRoute)) {
            this.currentRoute = actualRoute;
            this.router.navigate(actualRoute);
        }
    }




    private async setupPlotMenu(replaceEdit: boolean) {
        this.clearMenuExcept(['topleft', 'topright', 'bottomleft', 'bottomright']);
        const plot = await this.plotService.getPlot(this.owner.selectedId);

        if (!plot) {
            console.error(`Unable to find plot with id ${this.owner.selectedId}`);
            return;
        }

        let editButton = this.getEntry('plot_edit', { plot: this.owner.selectedId });
        if (replaceEdit) {
            editButton = this.getEntry('back');
        }

        this.overrideOptions([
            this.getEntry('zen'),
            this.getEntry('plot_create'),
            this.getEntry('plot_delete', { plot: this.owner.selectedId }),
            editButton,
            this.getEntry('plot_filter', { plot: this.owner.selectedId, voiceOnly: true })
        ]);

        this.overrideMenu('bottomright', this.getEntry('plot_color', {
            plot: this.owner.selectedId,
            color: plot.color,
            active: plot.useColor
        }));
        this.overrideMenu('bottomleft', this.getEntry('plot_sort', {
            plot: this.owner.selectedId,
            color: plot.color,
            active: plot.useSort
        }));
        this.overrideMenu('topright', this.getEntry('link_create', {
            plot: this.owner.selectedId,
            color: Utils.getSecondaryColor(plot.color)
        }));
        this.overrideMenu('topleft', this.getEntry('plot_move', {
            plot: this.owner.selectedId,
            color: Utils.getSecondaryColor(plot.color)
        }));
    }



    private async setupLinkMenu(replaceEdit: boolean) {
        this.clearMenuExcept(['left', 'right']);
        const link = await this.linkService.getLink(this.owner.selectedId);

        if (!link) {
            return;
        }

        let editButton = this.getEntry('link_edit', { link: this.owner.selectedId });
        if (replaceEdit) {
            editButton = this.getEntry('back');
        }

        this.overrideOptions([
            this.getEntry('zen'),
            this.getEntry('plot_create'),
            this.getEntry('link_delete', { link: this.owner.selectedId }),
            editButton,
        ]);

        if (this.isEndlessLoop(link.upstream, [ link.downstream ], link.id)) {
            this.overrideMenu('left', this.getEntry('link_invert_disabled', {
                link: this.owner.selectedId,
                color: DEFAULT_LINK_COLOR,
                disabled: true
            }));
        } else {
            this.overrideMenu('left', this.getEntry('link_invert', {
                link: this.owner.selectedId,
                color: DEFAULT_LINK_COLOR
            }));
        }
        this.overrideMenu('right', this.getEntry('link_color', {
            link: this.owner.selectedId,
            color: DEFAULT_LINK_COLOR,
            active: link && link.useColor
        }));
    }



    private isEndlessLoop(plotId: number, visitedPlots: number[], ignoreLinkId = -1): boolean {

        visitedPlots.push(plotId);

        const links = _.filter(this.linkService.links, l => l.upstream === plotId);
        let isEndlessLoop = false;
        for (const link of links) {
            if (link.id === ignoreLinkId) {
                continue;
            }

            if (visitedPlots.indexOf(link.downstream) >= 0) {
                return true;
            } else {
                isEndlessLoop = isEndlessLoop || this.isEndlessLoop(link.downstream, _.clone(visitedPlots));
            }

            if (isEndlessLoop) {
                return true;
            }
        }

        return false;
    }

    private setupLinkPlacementScreen(link: Link): void {
        const errorMenuEntry: ScreenMenuItem = {
            icon: 'not_interested',
            action: 'none',
            actionName: '',
            voice: '',
            voiceName: '',
            metadata: {
                disabled: true
            }
        };

        this.clearMenuExcept(['left', 'right']);
        this.clearOptions();


        this.overrideMenu('left', {
            icon: 'cancel',
            action: 'link_cancel',
            actionName: 'Cancel',
            voice: 'cancel',
            voiceName: `<color=${VOICE_ACTIVE_COLOR}>Cancel`,
            metadata: {
                link: link.id
            }
        });



        const lookAtId = this.owner.lookingAtId;
        const lookAtType = this.owner.lookingAtType;

        const isUserLookingAtDifferentPlot =
            (lookAtType === 'plot'
            && lookAtId !== link.upstream
            && lookAtId !== link.downstream);

        if (isUserLookingAtDifferentPlot) {

            const upstream = link.upstream === -1 ? lookAtId : link.upstream;
            const downstream = link.downstream === -1 ? lookAtId : link.downstream;

            const linkAlreadyExists = _.find(this.linkService.links, l =>
                (l.upstream === upstream && l.downstream === downstream)
                || (l.upstream === downstream && l.downstream === upstream));

            // does connection already exist?
            if (linkAlreadyExists) {
                this.overrideMenu('right', {
                    icon: 'shuffle',
                    action: 'link_replace',
                    actionName: 'Replace',
                    voice: 'replace',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Replace`,
                    metadata: {
                        link: link.id,
                        other: linkAlreadyExists.id
                    }
                });

            } else if (this.isEndlessLoop(downstream, [ upstream ])) { // does connection form endless loop?
                errorMenuEntry.actionName = 'Invalid: Endless loop';
                errorMenuEntry.voiceName = `<color=${VOICE_INACTIVE_COLOR}>${errorMenuEntry.actionName}`;
                this.overrideMenu('right', errorMenuEntry);

            } else { // none of the above -> valid link!
                this.overrideMenu('right', {
                    icon: 'pin_drop',
                    action: 'link_place',
                    actionName: 'Connect',
                    voice: 'connect',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Connect`,
                    metadata: {
                        link: link.id
                    }
                });
            }

        } else {
            // is user looking at the same plot?
            if (lookAtId !== -1 && (lookAtId === link.upstream || lookAtId === link.downstream)) {

                errorMenuEntry.actionName = 'Cannot link itself';
                errorMenuEntry.voiceName = `<color=${VOICE_INACTIVE_COLOR}>${errorMenuEntry.actionName}`;
                this.overrideMenu('right', errorMenuEntry);

            } else if (!lookAtType) { // user is looking at no plot
                this.overrideMenu('right', {
                    icon: 'visibility',
                    action: 'none',
                    actionName: 'Look at scatter plot',
                    voice: '',
                    voiceName: `<color=${VOICE_INACTIVE_COLOR}>Look at scatter plot`,
                    metadata: {
                        disabled: true
                    }
                });
            } else {
                // looking at link, use default (do nothing)
                // console.warn('Unknown condition for link setup! Using default');
            }

        }
    }



    private getEntry(name: string, metadata?: any): ScreenMenuItem {
        switch (name) {
            case 'unassigned':
                return {
                    icon: 'cancel',
                    action: 'none',
                    actionName: 'Tablet not assigned',
                    voice: '',
                    voiceName: '',
                    metadata: {
                        disabled: true
                    }
                };

            case 'back':
                return {
                    icon: 'arrow_back',
                    action: 'back',
                    actionName: 'Go back',
                    voice: 'back',
                    voiceName: `<color=${VOICE_INACTIVE_COLOR}>Go <color=${VOICE_ACTIVE_COLOR}>back`,
                    metadata: {}
                };

            case 'switch':
                return {
                    icon: 'filled_by_caller',
                    action: 'select',
                    voice: '',
                    actionName: 'Switch now',
                    voiceName: `<color=${VOICE_INACTIVE_COLOR}>Switch now</color>`,
                    metadata: metadata || {}
                };

            case 'plot_create':
                return {
                    icon: 'add',
                    action: 'plot_create',
                    actionName: 'Create scatter plot',
                    voice: 'create',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Create <color=${VOICE_INACTIVE_COLOR}>scatter plot`,
                    metadata: metadata || {}
                };

            case 'vertical_target':
                return {
                    icon: 'gps_fixed',
                    action: 'none',
                    actionName: 'Point tablet at target',
                    voice: '',
                    voiceName: `<color="${VOICE_INACTIVE_COLOR}>Point tablet at target`,
                    metadata: metadata || {}
                };

            case 'plot_delete':
                return {
                    icon: 'delete_forever',
                    action: 'plot_delete',
                    actionName: 'Delete',
                    voice: 'delete',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Delete`,
                    metadata: metadata || {}
                };

            case 'plot_edit':
            return {
                icon: 'scatter_plot',
                action: 'plot_vis',
                actionName: 'Edit visualization',
                voice: 'edit',
                voiceName: `<color=${VOICE_ACTIVE_COLOR}>Edit <color=${VOICE_INACTIVE_COLOR}>visualization`,
                metadata: metadata || {} };

            case 'plot_filter':
            return {
                icon: 'scatter_plot',
                action: 'plot_use_filter',
                actionName: 'Toggle filter',
                voice: 'filter',
                voiceName: `<color=${VOICE_INACTIVE_COLOR}>Toggle <color=${VOICE_ACTIVE_COLOR}>filter`,
                metadata: metadata || {}
            };

            case 'plot_color':
                return {
                    icon: 'color_lens',
                    action: 'plot_color',
                    actionName: 'Toggle color',
                    voice: 'color',
                    voiceName: `<color=${VOICE_INACTIVE_COLOR}>Toggle <color=${VOICE_ACTIVE_COLOR}>color`,
                    metadata: metadata || {}
                };

            case 'plot_sort':
                return {
                    icon: 'sort',
                    action: 'plot_sort',
                    actionName: 'Toggle sort',
                    voice: 'sort',
                    voiceName: `<color=${VOICE_INACTIVE_COLOR}>Toggle <color=${VOICE_ACTIVE_COLOR}>sort`,
                    metadata: metadata || {}
                };

            case 'plot_move':
                return {
                    icon: 'open_with',
                    action: 'plot_move',
                    actionName: 'Move',
                    voice: 'move',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Move`,
                    metadata: metadata || {}
                };

            case 'link_create':
                return {
                    icon: 'timeline',
                    action: 'plot_create_link',
                    actionName: 'Create link',
                    voice: 'link',
                    voiceName: `<color=${VOICE_INACTIVE_COLOR}>Create <color=${VOICE_ACTIVE_COLOR}>link`,
                    metadata: metadata || {}
                };

            case 'link_delete':
                return {
                    icon: 'delete_forever',
                    action: 'link_delete',
                    actionName: 'Delete',
                    voice: 'delete',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Delete`,
                    metadata: metadata || {}
                };

            case 'link_edit':
                return {
                    icon: 'show_chart',
                    action: 'link_vis',
                    actionName: 'Edit visualization',
                    voice: 'edit',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Edit <color=${VOICE_INACTIVE_COLOR}>visualization`,
                    metadata: metadata || {}
                };

            case 'link_invert_disabled':
                return {
                    icon: 'autorenew',
                    action: 'none',
                    actionName: '<size=-3>Unable to invert: Endless loop',
                    voice: '',
                    voiceName: `<size=-3><color=${VOICE_INACTIVE_COLOR}>Unable to invert: Endless loop`,
                    metadata: metadata || {}
                };

            case 'link_invert':
                return {
                    icon: 'autorenew',
                    action: 'link_invert',
                    actionName: 'Invert direction',
                    voice: 'invert',
                    voiceName: `<color=${VOICE_ACTIVE_COLOR}>Invert <color=${VOICE_INACTIVE_COLOR}>direction`,
                    metadata: metadata || {}
                };

            case 'link_color':
                return {
                    icon: 'color_lens',
                    action: 'link_color',
                    actionName: 'Toggle color',
                    voice: 'color',
                    voiceName: `<color=${VOICE_INACTIVE_COLOR}>Toggle <color=${VOICE_ACTIVE_COLOR}>color`,
                    metadata: metadata || {}
                };

            case 'zen':
                if (this.owner.zenMode) {
                    return {
                        icon: 'visibility',
                        action: 'zen_off',
                        actionName: 'Show UI',
                        voice: 'show',
                        voiceName: `<color=${VOICE_ACTIVE_COLOR}>Show <color=${VOICE_INACTIVE_COLOR}>UI`,
                        metadata: {}
                    };
                } else {
                    return {
                        icon: 'visibility_off',
                        action: 'zen_on',
                        actionName: 'Hide UI',
                        voice: 'hide',
                        voiceName: `<color=${VOICE_ACTIVE_COLOR}>Hide <color=${VOICE_INACTIVE_COLOR}>UI`,
                        metadata: {}
                    };
                }


            default:
                throw new Error(`Unknown screen entry ${name}`);
        }



    }
}

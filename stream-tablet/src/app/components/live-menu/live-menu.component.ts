import { untilDestroyed } from 'ngx-take-until-destroy';
import * as Hammer from 'hammerjs';
import * as _ from 'lodash';
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { WebClient, ScreenMenuItem } from '@stream/models';
import { ActionsService } from '@stream/services';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-live-menu',
    templateUrl: './live-menu.component.html',
    styleUrls: ['./live-menu.component.scss']
})
export class LiveMenuComponent implements OnInit, OnDestroy {
    @ViewChild('overlayLeft', { static: true }) overlayLeft: ElementRef;
    @ViewChild('overlayRight', { static: true }) overlayRight: ElementRef;

    client = WebClient.Instance;

    private deviceHeight = 1;

    private timer;
    private pressedMenu: ScreenMenuItem;

    private scrollTimer;

    blindMenu: { [key: string]: ScreenMenuItem } = {};
    options: ScreenMenuItem[] = [];

    constructor(private actions: ActionsService, private elementRef: ElementRef) { }

    ngOnInit() {
        const bcr = this.overlayLeft.nativeElement.getBoundingClientRect();
        this.deviceHeight = bcr.height;

        this.initHammer(this.overlayLeft.nativeElement, 'left');
        this.initHammer(this.overlayRight.nativeElement, 'right');

        this.client.modelChanges$
            .pipe(untilDestroyed(this), filter(changes => changes.indexOf('isVoiceActive') >= 0))
            .subscribe(() => {
                this.clearTimers();
                this.pressedMenu = null;
            });

        this.client.modelChanges$
            .pipe(untilDestroyed(this), filter(changes => changes.indexOf('screenMenu') >= 0))
            .subscribe(() => this.updateScreenMenu());
        this.updateScreenMenu();


        // workaround: clicking multiple times on some icons causes scroll-down on ipad???
        this.scrollTimer = setInterval(() => {
            document.body.scrollTop = 0;
            this.elementRef.nativeElement.scrollTop = 0;
        }, 100);
    }


    ngOnDestroy() {
        clearInterval(this.scrollTimer);
        // for untilDestroyed
    }

    private initHammer(el: HTMLElement, dir: 'left' | 'right'): void {
        const hammerElement = new Hammer(el);
        hammerElement.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });

        hammerElement.on('tap', event => this.handleTap(event, dir));
        hammerElement.on('press', event => this.handlePress(event, dir));
        hammerElement.on('pressup', event => this.handlePressUp(event, dir));
        hammerElement.on('panend', event => this.clearTimers());
    }

    private updateScreenMenu() {
        this.blindMenu = {};
        for (const key of _.keys(this.client.screenMenu)) {
            if (WebClient.ScreenMenuPositions.includes(key)) {
                this.blindMenu[key] = this.client.screenMenu[key];
            }
        }

        this.options = _.filter(this.client.screenMenu.options || [], m => m.metadata && !m.metadata.voiceOnly);
    }

    private getClickedMenu(event: HammerInput, horizontalDir: 'left' | 'right'): ScreenMenuItem {
        const verticalDir = (event.center.y < this.deviceHeight / 2) ? 'top' : 'bottom';
        const menu = this.client.screenMenu;

        return <ScreenMenuItem>(menu[verticalDir + horizontalDir] || menu[horizontalDir] || menu[verticalDir] || menu['center']);
    }

    private clearTimers(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }

        if (this.pressedMenu && this.pressedMenu.metadata.useHold) {
            this.pressedMenu.metadata.progress = 0;
        }
    }

    private handleTap(event: HammerInput, dir: 'left' | 'right'): void {
        this.clearTimers();
        const menu = this.getClickedMenu(event, dir);

        if (menu && !menu.metadata.progressDuration) {
            this.triggerAction(menu);
        }
    }


    private handlePress(event: HammerInput, dir: 'left' | 'right'): void {
        this.clearTimers();
        const menu = this.getClickedMenu(event, dir);
        this.pressedMenu = menu;

        if (menu && menu.metadata.useHold) {
            menu.metadata.progress = 0;

            this.timer = setInterval(() => {
                menu.metadata.progress++;

                if (menu.metadata.progress >= 100) {
                    this.clearTimers();
                    this.triggerAction(menu);
                }
            }, menu.metadata.progressDuration * 6);
        }
    }

    private handlePressUp(event: HammerInput, dir: 'left' | 'right'): void {
        this.clearTimers();

        if (this.pressedMenu && !this.pressedMenu.metadata.useHold) {
            this.triggerAction(this.pressedMenu);
        }
    }


    getMenuText(menu: ScreenMenuItem): string {
        if (menu && menu.actionName) {
            return menu.actionName.replace(/<.*?>/gm, '');
        } else {
            return '';
        }
    }

    triggerAction(menu: ScreenMenuItem): void {
        this.actions.triggerTouch(menu.action, menu.metadata);
    }

    getStyle(metadata: any): any {
        if (!metadata) {
            return {};
        }

        const style = {};
        if (metadata.color) {
            style['background-color'] = metadata.color;
        }
        return style;
    }
}

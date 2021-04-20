import { Router } from '@angular/router';
import { Component, HostListener } from '@angular/core';
import { SocketIO, WebClientUpdaterService, OwnerService, RemoteRestartService } from '@stream/services';
import { WebClient, NC_WEBCLIENT_INTERACTION_LOG } from '@stream/models';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    client = WebClient.Instance;

    public constructor(
        private webClientUpdater: WebClientUpdaterService, // for initialization
        private ownerServer: OwnerService, // for initialization
        private router: Router,
        private socketIO: SocketIO,
        private remoteRestartService: RemoteRestartService) {
        webClientUpdater.init();

        // study logging: capture every interaction
        document.addEventListener('touchstart', e => this.logTouch('start', e));
        document.addEventListener('touchmove', e => this.logTouch('move', e));
        document.addEventListener('touchend', e => this.logTouch('end', e));
    }

    goBack(): void {
        this.router.navigate(['../']);
    }

    private logTouch(type: string, e: TouchEvent) {
        for (let i = 0; i < e.targetTouches.length; i++) {
            const touch = e.targetTouches[i];
            const ownerData = this.ownerServer.CurrentOwner.value ? this.ownerServer.CurrentOwner.value.toJson() : { 'error': 'no owner' };

            this.socketIO.send(NC_WEBCLIENT_INTERACTION_LOG, '', {
                type: type,
                currentUrl: window.location.pathname,
                clientX: touch.clientX,
                clientY: touch.clientY,
                screenX: touch.screenX,
                screenY: touch.screenY,
                touchNumber: i,
                time: new Date().getTime(),
                state: WebClient.Instance.toJson(),
                owner: ownerData
            });
        }
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.webClientUpdater.updateDeviceSize();
    }
}

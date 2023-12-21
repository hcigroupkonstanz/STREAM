import { Injectable } from '@angular/core';

import { SocketIO } from './socket-io.service';
import { Logger } from './logger.service';
import { WebClient, NC_WEBCLIENT } from '@stream/models';
import { OrientationService } from './orientation.service';


@Injectable({
    providedIn: 'root'
})
export class WebClientUpdaterService {

    constructor(
        private socketio: SocketIO,
        private logger: Logger,
        private orientationService: OrientationService) {
    }

    public init(): void {
        WebClient.Instance.localModelChanges$.subscribe(changes => {
            this.socketio.send(NC_WEBCLIENT, 'update', WebClient.Instance.toJson(changes));
        });

        let isFirstUpdate = true;

        this.socketio.send(NC_WEBCLIENT, 'request', null);

        this.socketio.on(NC_WEBCLIENT, (cmd, payload) => {
            switch (cmd) {
                case 'request':
                case 'update':
                    WebClient.Instance.remoteUpdate(payload);
                    if (isFirstUpdate) {
                        this.updateDeviceSize();
                        isFirstUpdate = false;
                    }
                break;

                default:
                    this.logger.warn(`Unknown command ${cmd} for webclient`);
                    break;
            }
        });

        this.orientationService.state.subscribe(state => {
            WebClient.Instance.orientation = state;
        });
    }

    public updateDeviceSize(): void {
        WebClient.Instance.resolutionWidth = window.screen.availWidth * window.devicePixelRatio;
        WebClient.Instance.resolutionHeight = window.screen.availHeight * window.devicePixelRatio;
    }
}

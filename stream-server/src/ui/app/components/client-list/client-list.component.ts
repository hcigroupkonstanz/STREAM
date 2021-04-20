import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ClientsService, SocketIOService } from '@stream/services';

@Component({
    selector: 'app-client-list',
    templateUrl: './client-list.component.html',
    styleUrls: ['./client-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientListComponent implements OnInit {

    constructor(public clients: ClientsService,
        private socket: SocketIOService,
        changeDetector: ChangeDetectorRef) {
            clients.updates$.subscribe(() => changeDetector.detectChanges());
        }


    ngOnInit() {
    }

    getId(client: any): number {
        return client.id;
    }

    calibrateUnityClient(id: number): void {
        this.socket.execute(`unityclients calibrate ${id}`);
    }

    calibrateWebClient(id: number): void {
        this.socket.execute(`webclients calibrate ${id}`);
    }

    restartWebClient(id: number): void {
        this.socket.execute(`webclients restart ${id}`);
    }

    toggleWebSettings(id: number): void {
        this.socket.execute(`webclients settings ${id}`);
    }

    setOrigin(index: number, id: number): void {
        this.socket.execute(`tracker origin ${index} ${id}`);
    }

    toggleIndicators(id: number, val: boolean): void {
        this.socket.execute(`unityclients debug ${id}`);
    }

    deletePlot(id: number): void {
        this.socket.execute(`plot delete ${id}`);
    }

    deleteLink(id: number): void {
        this.socket.execute(`link delete ${id}`);
    }
}

import { Injectable } from '@angular/core';
import { SocketIOService } from './socket.service';
import { Observable, merge } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ClientsService {
    public updates$: Observable<void>;

    public unityClients: any[] = [];
    public webClients: any[] = [];
    public trackers: any[] = [];
    public plots: any[] = [];
    public links: any[] = [];
    public ips: any[] = [];

    constructor(private socket: SocketIOService) {
        socket.listen('unityclients').subscribe(clients => this.handleUnityClients(clients));
        socket.listen('webclients').subscribe(clients => this.handleWebClients(clients));
        socket.listen('trackers').subscribe(trackers => this.handleTrackers(trackers));
        socket.listen('plots').subscribe(plots => this.plots = plots);
        socket.listen('links').subscribe(links => this.links = links);
        socket.listen('ips').subscribe(ips => this.ips = ips);

        this.updates$ = merge(
            socket.listen('unityclients'),
            socket.listen('webclients'),
            socket.listen('trackers'),
            socket.listen('plots'),
            socket.listen('links'),
            socket.listen('ips')
        );
    }

    private handleUnityClients(clients: any[]): void {
        // make offsetmatrix a little bit more compact
        for (const c of clients) {
            c.offsetMatrix = JSON.stringify(c.offsetMatrix);
        }
        this.unityClients = clients;
    }

    private handleTrackers(trackers: any[]): void {
        this.trackers = trackers;
    }

    private handleWebClients(clients: any[]): void {
        for (const c of clients) {
            c.offsetMatrices = JSON.stringify(c.offsetMatrices);
        }

        this.webClients = clients;
    }
}

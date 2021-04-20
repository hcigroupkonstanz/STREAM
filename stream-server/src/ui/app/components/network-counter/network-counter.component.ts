import { Component, OnInit } from '@angular/core';
import { NetworkMessagesService, ClientsService } from '@stream/services';

@Component({
    selector: 'app-network-counter',
    templateUrl: './network-counter.component.html',
    styleUrls: ['./network-counter.component.scss']
})
export class NetworkCounterComponent implements OnInit {
    constructor(public msgService: NetworkMessagesService, public clients: ClientsService) { }

    ngOnInit() {

    }
}

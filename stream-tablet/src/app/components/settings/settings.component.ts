import { OwnerService } from '@stream/services';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
    constructor(public ownerService: OwnerService) { }

    ngOnInit() {
    }
}

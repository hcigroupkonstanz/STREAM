import { MatButtonToggleChange } from '@angular/material';
import { OwnerService } from '@stream/services';
import { Component, OnInit } from '@angular/core';
import { ArClient } from '@stream/models';

@Component({
    selector: 'app-owner-settings',
    templateUrl: './owner-settings.component.html',
    styleUrls: ['./owner-settings.component.scss']
})
export class OwnerSettingsComponent implements OnInit {
    constructor(public ownerService: OwnerService) { }

    ngOnInit() {
    }

    setIndicatorPosition(pos: string, $event: MatButtonToggleChange): void {
        const owner = this.ownerService.CurrentOwner.value;
        if (owner) {
            owner.indicatorPosition = pos;
        }

        $event.source.checked = true;
    }
}

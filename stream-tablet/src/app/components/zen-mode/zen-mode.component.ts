import { ActionsService } from '@stream/services';
import { Component, OnInit, ElementRef } from '@angular/core';

@Component({
    selector: 'app-zen-mode',
    templateUrl: './zen-mode.component.html',
    styleUrls: ['./zen-mode.component.scss']
})
export class ZenModeComponent implements OnInit {

    constructor(private actions: ActionsService) { }

    ngOnInit() {
    }

    stopZenMode() {
        this.actions.triggerTouch('zen_off', {});
    }

}

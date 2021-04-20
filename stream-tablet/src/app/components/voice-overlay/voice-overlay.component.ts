import { Component, OnInit } from '@angular/core';
import { WebClient } from '@stream/models';

@Component({
    selector: 'app-voice-overlay',
    templateUrl: './voice-overlay.component.html',
    styleUrls: ['./voice-overlay.component.scss']
})
export class VoiceOverlayComponent implements OnInit {

    client = WebClient.Instance;

    constructor() { }

    ngOnInit() {
    }

}

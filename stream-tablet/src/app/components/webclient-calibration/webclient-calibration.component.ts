import { Component, OnInit } from '@angular/core';
import { WebClient } from '@stream/models';

@Component({
    selector: 'app-webclient-calibration',
    templateUrl: './webclient-calibration.component.html',
    styleUrls: ['./webclient-calibration.component.scss']
})
export class WebclientCalibrationComponent implements OnInit {

    constructor() { }

    ngOnInit() {
    }

    cancelCalibration() {
        WebClient.Instance.isCalibrating = false;
    }
}

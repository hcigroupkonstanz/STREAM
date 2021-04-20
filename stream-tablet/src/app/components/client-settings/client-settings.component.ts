import * as _ from 'lodash';
import { Component, OnInit } from '@angular/core';
import { Tracker, WebClient } from '@stream/models';
import { TrackerService, OwnerService } from '@stream/services';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-client-settings',
    templateUrl: './client-settings.component.html',
    styleUrls: ['./client-settings.component.scss']
})
export class ClientSettingsComponent implements OnInit {
    client = WebClient.Instance;
    clientTrackers: number[] = [];
    trackers: Tracker[];

    constructor(
        private trackerService: TrackerService,
        public ownerService: OwnerService) {
        this.trackers = trackerService.trackers;
    }

    ngOnInit() {
        this.clientTrackers = <number[]>_.clone(this.client.trackers);
        this.client.remoteModelChanges$
            .pipe(filter(changes => _.includes(changes, 'trackers')))
            .subscribe(() => this.clientTrackers = <number[]>_.clone(this.client.trackers));
    }

    updateTrackers(): void {
        this.client.trackers = _.clone(this.clientTrackers);
    }

    addTracker(): void {
        this.client.trackers = _.concat(this.client.trackers, -1);
    }

    removeTracker(): void {
        if (this.client.trackers.length > 1) {
            this.client.trackers = _.take(this.client.trackers, this.client.trackers.length - 1);
        }
    }

    startCalibration(): void {
        this.client.isCalibrating = true;
    }

    getId(tracker: Tracker): number {
        return tracker.id;
    }

    goBack() {
        const client = WebClient.Instance;
        client.screenMenu.selectedMenu = '';
        client.updateScreenMenu();
    }
}

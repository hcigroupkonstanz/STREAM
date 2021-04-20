import * as _ from 'lodash';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { SocketIO, TrackerService } from '@stream/services';
import { WebClient } from '@stream/models';
import { untilDestroyed } from 'ngx-take-until-destroy';
import { filter } from 'rxjs/operators';
import { merge } from 'rxjs';

@Component({
    selector: 'app-disconnect-warning',
    templateUrl: './disconnect-warning.component.html',
    styleUrls: ['./disconnect-warning.component.scss']
})
export class DisconnectWarningComponent implements OnInit, OnDestroy {
    public inactiveTrackers = 0;
    public orientation = '';

    constructor(public sio: SocketIO, private trackerService: TrackerService) { }

    ngOnInit(): void {
        const tablet = WebClient.Instance;
        this.trackerService.remoteUpdates$
            .pipe(untilDestroyed(this), filter(ev => _.includes(ev.changes, 'isActive')))
            .subscribe(() => this.updateTrackers());
        tablet.modelChanges$
            .pipe(untilDestroyed(this), filter(changes => _.includes(changes, 'trackers')))
            .subscribe(() => this.updateTrackers());
        this.updateTrackers();

        tablet.modelChanges$
            .pipe(untilDestroyed(this), filter(changes => _.includes(changes, 'orientation')))
            .subscribe(() => this.orientation = tablet.orientation);
        this.orientation = tablet.orientation;
    }

    ngOnDestroy(): void {
        // for ngxUntilDestroyed
    }

    private updateTrackers(): void {
        this.inactiveTrackers = 0;
        for (const id of WebClient.Instance.trackers) {
            if (id === -1) {
                continue;
            }

            const tracker = _.find(this.trackerService.trackers, t => t.id === id);
            if (!tracker || !tracker.isActive) {
                this.inactiveTrackers++;
            }
        }
    }
}

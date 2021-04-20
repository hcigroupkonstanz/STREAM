import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { LogService, GroupedLogMessage } from '@stream/services';
import PerfectScrollbar from 'perfect-scrollbar';

@Component({
    selector: 'app-log',
    templateUrl: './log.component.html',
    styleUrls: ['./log.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogComponent implements OnInit, AfterViewChecked {
    @ViewChild('scrollContainer', { static: true }) private scrollContainer: ElementRef;
    manualScroll = false;

    constructor(public log: LogService, changeDetector: ChangeDetectorRef) {
        log.updates$.subscribe(() => changeDetector.detectChanges());
    }

    ngOnInit() {
        this.scrollContainer.nativeElement.addEventListener('wheel', ev => this.onScroll(ev.deltaY));
        const ps = new PerfectScrollbar(this.scrollContainer.nativeElement);
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    private scrollToBottom(): void {
        if (!this.manualScroll) {
            try {
                const el = this.scrollContainer.nativeElement;
                el.scrollTop = el.scrollHeight;
            } catch (err) {
                console.error(err);
            }
        }
    }

    getId(entry: GroupedLogMessage): number {
        return entry.id;
    }

    onScroll(deltaY: number): void {
        const el = this.scrollContainer.nativeElement;
        if (deltaY < 0) {
            this.manualScroll = true;
        } else if (el.scrollTop + el.offsetHeight >= el.scrollHeight) {
            this.manualScroll = false;
        }
    }

    scrollAutomatically(): void {
        this.manualScroll = false;
        this.scrollToBottom();
    }
}

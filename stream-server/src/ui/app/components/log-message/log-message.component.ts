import { GroupedLogMessage } from '@stream/services';
import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-log-message',
    templateUrl: './log-message.component.html',
    styleUrls: ['./log-message.component.scss']
})
export class LogMessageComponent implements OnInit {

    @Input() public log: GroupedLogMessage;

    constructor() { }

    ngOnInit() {
    }

}

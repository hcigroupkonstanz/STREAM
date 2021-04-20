import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { SocketIOService } from '@stream/services';

@Component({
    selector: 'app-server-input',
    templateUrl: './server-input.component.html',
    styleUrls: ['./server-input.component.scss']
})
export class ServerInputComponent implements OnInit, AfterViewInit {
    @ViewChild('cmd', { static: false }) container: ElementRef;

    private history: string[] = [];
    private historyIndex = 0;
    private prevInput = '';

    constructor(private socket: SocketIOService) { }

    ngOnInit() {
    }

    ngAfterViewInit() {
        this.container.nativeElement.focus();
    }

    onEnter($event) {
        $event.preventDefault();
        const input = $event.target.textContent;
        this.socket.evaluate(input);

        this.prevInput = '';
        this.history.splice(0, 0, input);
        this.historyIndex = 0;
        this.container.nativeElement.textContent = '';
    }

    historyBack($event) {
        $event.preventDefault();

        if (this.historyIndex === 0) {
            this.prevInput = this.container.nativeElement.textContent;
        }

        if (this.historyIndex < this.history.length) {
            this.container.nativeElement.textContent = this.history[this.historyIndex];
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
            }
        }
    }

    historyForward($event) {
        $event.preventDefault();

        if (this.historyIndex === 0) {
            this.container.nativeElement.textContent = this.prevInput;
        } else {
            this.historyIndex--;
            this.container.nativeElement.textContent = this.history[this.historyIndex];
        }
    }
}

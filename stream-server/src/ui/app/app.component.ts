import { SocketIOService } from '@stream/services';
import { Component } from '@angular/core';

const tutorialText = 'Load Tutorial';
const studyText = 'Load Study';
const confirmText = 'Are you sure?';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    title = 'server-app';
    loadTutorialText = tutorialText;
    loadStudyText = studyText;

    timer: any;

    public constructor(private socket: SocketIOService) {
    }

    onTutorialClick() {
        clearTimeout(this.timer);
        this.loadStudyText = studyText;

        if (this.loadTutorialText === tutorialText) {
            this.loadTutorialText = confirmText;
            this.timer = setTimeout(() => {
                this.loadTutorialText = tutorialText;
            }, 2000);
        } else {
            this.socket.evaluate('study.load("tutorial")');
            this.loadTutorialText = tutorialText;
        }
    }

    onStudyClick() {
        clearTimeout(this.timer);
        this.loadTutorialText = tutorialText;

        if (this.loadStudyText === studyText) {
            this.loadStudyText = confirmText;
            this.timer = setTimeout(() => {
                this.loadStudyText = studyText;
            }, 2000);
        } else {
            this.socket.evaluate('study.load("study")');
            this.loadStudyText = studyText;
        }
    }
}

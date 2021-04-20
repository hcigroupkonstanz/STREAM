import { PlotService, Logger } from '@stream/services';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-plot-list',
  templateUrl: './plot-list.component.html',
  styleUrls: ['./plot-list.component.scss']
})
export class PlotListComponent implements OnInit {

    hasUserClicked = false;
    plots = [];

    constructor(
        private router: Router,
        public plotService: PlotService,
        private logger: Logger) { }

    ngOnInit() {
    }

    createScatterplot() {
        this.hasUserClicked = true;
        this.plotService.create();
    }

    modifyScatterplot(id: number) {
        try {
            this.hasUserClicked = true;
            this.router.navigate(['/debug/', id]);
        } catch (e) {
            this.logger.error(e.message);
            this.hasUserClicked = false;
        }
    }
}

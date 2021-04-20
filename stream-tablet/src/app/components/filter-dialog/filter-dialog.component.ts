import * as _ from 'lodash';
import { FilterService } from '@stream/services';
import { WebClient, Filter as PlotFilter } from '@stream/models';
import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
    selector: 'app-filter-dialog',
    templateUrl: './filter-dialog.component.html',
    styleUrls: ['./filter-dialog.component.scss']
})
export class FilterDialogComponent implements OnInit {
    @Input() filter: PlotFilter;
    @Output() close: EventEmitter<any> = new EventEmitter();

    colors = [
        // material colour palette, see https://material.io/guidelines/style/color.html
        '#F44336', // red
        '#9C27B0', // purple
        '#3F51B5', // indigo
        '#2196F3', // blue
        '#4CAF50', // green
        '#FFEB3B', // yellow
        '#FF9800', // orange
        '#00BCD4', // cyan
    ];

    gradients = [
        'g:#f44336:#36f468', // red -> green
        'g:#2196f3:#f36e21', // blue -> orange
        'g:#ffffff:#3F51B5', // white -> indigo
        'g:#2196F3:#4CAF50:#FFEB3B:#f44336', // hue (blue -> green -> yellow -> red)
        // 'g:#F44336:#9C27B0', // red -> purple
        // 'g:#3F51B5:#4CAF50', // indigo -> green
        // 'g:#FFEB3B:#00BCD4', // yellow -> cyan
        // 'g:#FFEB3B:#00BCD4:#F44336', // yellow -> cyan -> red
        // 'g:#FFEB3B:#00BCD4:#F44336:#4CAF50', // yellow -> cyan -> red -> green
    ];


    constructor(
        private sanitizer: DomSanitizer,
        private filterProvider: FilterService
    ) { }

    ngOnInit() {
        this.filter.selectedBy = _.concat(this.filter.selectedBy, WebClient.Instance.id);
        console.log(`Filter Dialog: Opening for ${this.filter.id}`);
    }

    onClose(): void {
        this.filter.selectedBy = _.without(this.filter.selectedBy, WebClient.Instance.id);
        console.log(`Filter Dialog: Closing for ${this.filter.id}`);
        this.close.emit(null);
    }

    onDeleteFilter(): void {
        this.filterProvider.remove(this.filter.uuid);
        console.log(`Filter Dialog: Deleting ${this.filter.id}`);
        this.close.emit(null);
    }

    getGradientStyle(gradient: string): any {
        const colors = gradient.split(':').slice(1);
        const gradientStops = [];

        for (let i = 0; i < colors.length; i++) {
            gradientStops.push(`${colors[i]} ${Math.round(i / (colors.length - 1) * 100)}%`);
        }

        return this.sanitizer.bypassSecurityTrustStyle(
            `background: linear-gradient(to bottom, ${gradientStops.join(', ')})`);
    }
}

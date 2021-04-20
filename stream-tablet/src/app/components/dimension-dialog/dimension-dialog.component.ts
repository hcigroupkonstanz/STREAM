import * as _ from 'lodash';
import { DataDimensionService } from '@stream/services';
import { Component, OnInit, Input, EventEmitter, Output } from '@angular/core';
import { Plot, DataDimension } from '@stream/models';

@Component({
    selector: 'app-dimension-dialog',
    templateUrl: './dimension-dialog.component.html',
    styleUrls: ['./dimension-dialog.component.scss']
})
export class DimensionDialogComponent implements OnInit {

    @Input() plot: Plot;
    @Input() axis: 'x' | 'y';
    @Output() close: EventEmitter<any> = new EventEmitter();

    searchQuery = '';
    selectedDim = '';

    constructor(private dimensionService: DataDimensionService) {
    }

    ngOnInit() {
        if (this.plot) {
            console.log(`Dimension Selection: Opening on axis ${this.axis}`);
            this.selectedDim = this.axis === 'x' ? this.plot.dimX : this.plot.dimY;
        }
    }

    changeAxis(to: 'x' | 'y') {
        console.log(`Dimension Selection: Changing from axis ${this.axis} to ${to}`);
        this.axis = to;
        this.selectedDim = this.axis === 'x' ? this.plot.dimX : this.plot.dimY;
    }

    onDimensionClick(dim: string): void {
        if (this.axis === 'x') {
            this.plot.dimX = dim;
        } else {
            this.plot.dimY = dim;
        }

        this.selectedDim = dim;
    }

    onCloseClick(): void {
        console.log(`Dimension Selection: Closing on axis ${this.axis}`);
        this.close.emit(null);
    }

    getDimensions(): DataDimension[] {
        if (!this.searchQuery) {
            return this.dimensionService.dimensions$.value;
        } else {
            console.log(`Dimension Selection: Searching for '${this.searchQuery}'`);
            const query = this.searchQuery.toLowerCase();
            return _.filter(this.dimensionService.dimensions$.value, d =>
                d.column.toLowerCase().includes(query) ||
                d.displayName.toLowerCase().includes(query));
        }
    }
}

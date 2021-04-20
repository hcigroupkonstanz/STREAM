import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { first } from 'rxjs/operators';


@Injectable({
    providedIn: 'root'
})
export class ServiceLoader {

    private loadedSubject: ReplaySubject<void> = new ReplaySubject<void>();

    private dimensionDataLoaded = false;
    private graphLoaded = false;
    private filterLoaded = false;

    constructor() {
    }


    public onLoaded(): Observable<void> {
        return this.loadedSubject.asObservable();
    }

    private checkCompletion(): void {
        if (this.dimensionDataLoaded && this.graphLoaded && this.filterLoaded) {
            this.loadedSubject.next(null);
        }
    }
}

import * as _ from 'lodash';
import { PointUtils } from '@stream/root/point-utils';
import { ObservableModel } from './observable-model';
import { Utils } from '../utils';
import { filter, take, share } from 'rxjs/operators';
import { Subject } from 'rxjs';

export class Filter extends ObservableModel {
    private pathUpdates = new Subject<void>();
    // for quicker updates to local path changes
    public path$ = this.pathUpdates.asObservable();

    public initializedStream = new Subject<boolean>();
    public initialized = this.initializedStream.pipe(filter(v => v), take(1), share()).toPromise();

    private _uuid = Utils.uuidv4();
    public get uuid(): string {
        return this._uuid;
    }

    private _origin: number;
    public get origin(): number {
        return this._origin;
    }

    public set origin(val: number) {
        if (this._origin !== val) {
            this._origin = val;
            this.modelChanges.next('origin');
        }
    }

    private _selectedBy: number[] = [];
    public get selectedBy(): number[] {
        return this._selectedBy;
    }

    public set selectedBy(val: number[]) {
        if (!_.isEqual(this._selectedBy, val)) {
            this._selectedBy = val;
            this.modelChanges.next('selectedBy');
        }
    }

    private _color = '#2196F3';
    public get color(): string {
        return this._color;
    }

    public set color(val: string) {
        if (this._color !== val) {
            this._color = val;
            this.modelChanges.next('color');
        }
    }


    private _boundAxis: 'x' | 'y' | 'xy' = 'xy';
    public get boundAxis(): 'x' | 'y' | 'xy' {
        return this._boundAxis;
    }

    public set boundAxis(val: 'x' | 'y' | 'xy') {
        if (this._boundAxis !== val) {
            this._boundAxis = val;
            this.modelChanges.next('boundAxis');
        }
    }


    private _path: [number, number][] = [];
    public get path(): [number, number][] {
        return this._path;
    }


    private _isBeingCreatedBy = -1;
    public get isBeingCreatedBy(): number {
        return this._isBeingCreatedBy;
    }

    public set isBeingCreatedBy(val: number) {
        if (this._isBeingCreatedBy !== val) {
            this._isBeingCreatedBy = val;
            this.modelChanges.next('isBeingCreatedBy');
        }
    }


    // for bounding rectangle
    public minX = 0;
    public maxX = 0;
    public minY = 0;
    public maxY = 0;

    public constructor() {
        super();
        this.remoteModelChanges$
            .pipe(filter(changes => _.includes(changes, 'path')))
            .subscribe(() => this.recalculateBoundingRect());
    }


    public addPathPoint(p: [number, number]): void {
        const lp: [number, number] = [
            Math.min(Math.max(0, p[0]), 1.01),
            Math.min(Math.max(0, p[1]), 1.01),
        ];
        this.path.push(lp);

        if (this.path.length > 2) {
            const lineStart = this.path[this.path.length - 3];
            const prevPoint = this.path[this.path.length - 2];
            if (PointUtils.isOnLine(prevPoint, lineStart, p)) {
                this.path.splice(this.path.length - 2, 1);
            }
        }

        if (this.path.length === 1) {
            this.minX = this.maxX = p[0];
            this.minY = this.maxY = p[1];
        }

        // adjust bounding rect
        this.minX = Math.min(this.minX, p[0]);
        this.maxX = Math.max(this.maxX, p[0]);
        this.minY = Math.min(this.minY, p[1]);
        this.maxY = Math.max(this.maxY, p[1]);
        this.ensureMinimumBoundRectSize();

        this.modelChanges.next('path');
        this.pathUpdates.next();
    }

    public setPathPoint(index: number, p: [number, number]): void {
        this.path[index] = p;
        this.recalculateBoundingRect();
        this.modelChanges.next('path');
        this.pathUpdates.next();
    }

    public setFullPath(p: [number, number][]): void {
        this._path = p;
        this.recalculateBoundingRect();
        this.modelChanges.next('path');
        this.pathUpdates.next();
    }


    private recalculateBoundingRect(): void {
        if (!this._path || this._path.length === 0) {
            return;
        }

        this.minX = this._path[0][0];
        this.maxX = this._path[0][0];
        this.minY = this._path[0][1];
        this.maxY = this._path[0][1];

        for (let i = 0; i < this._path.length; i++) {
            this.minX = Math.min(this._path[i][0], this.minX);
            this.maxX = Math.max(this._path[i][0], this.maxX);
            this.minY = Math.min(this._path[i][1], this.minY);
            this.maxY = Math.max(this._path[i][1], this.maxY);
        }

        this.ensureMinimumBoundRectSize();
    }

    private ensureMinimumBoundRectSize(): void {
        const minSize = 0.05;
        if (PointUtils.distanceBetween([this.minX, this.minY], [this.maxX, this.maxY]) < minSize) {
            let avgX = 0;
            let avgY = 0;

            for (const p of this._path) {
                avgX += p[0];
                avgY += p[1];
            }

            avgX /= Math.max(1, this._path.length);
            avgY /= Math.max(1, this._path.length);

            this.minX = avgX - Math.sqrt(Math.pow(minSize, 2)) / 2;
            this.maxX = avgX + Math.sqrt(Math.pow(minSize, 2)) / 2;
            this.minY = avgY - Math.sqrt(Math.pow(minSize, 2)) / 2;
            this.maxY = avgY + Math.sqrt(Math.pow(minSize, 2)) / 2;
        } else {
            if (this.maxX - this.minX < minSize) {
                this.maxX += minSize / 2;
                this.minX -= minSize / 2;
            }

            if (this.maxY - this.minY < minSize) {
                this.maxY += minSize / 2;
                this.minY -= minSize / 2;
            }
        }
    }

    public toJson(attributes: string[] = []) {
        const json = super.toJson(attributes);
        json['uuid'] = this._uuid;
        return json;
    }
}

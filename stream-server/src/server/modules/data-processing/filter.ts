import * as _ from 'lodash';
import { ErrorHandler, Utils, Color } from '../core';
import { SqlSerializable } from '../database';
import { PointUtils } from './point-utils';
import { BehaviorSubject, Subject } from 'rxjs';


export class Filter extends SqlSerializable {
    public static readonly TableName = 'filters';
    public static readonly TableArgs = [
        'id INTEGER PRIMARY KEY',
        'uuid varchar(255)',
        'origin INT DEFAULT -1',
        'color varchar(255) DEFAULT "#2196F3"',
        'axisX varchar(255)',
        'axisY varchar(255)',
        'boundAxis varchar(2) DEFAULT "xy"',
        'path TEXT'
    ];

    private static readonly IncludeSubject = new Subject<Filter>();
    public static readonly Include$ = Filter.IncludeSubject.asObservable();


    private _uuid: string = null;
    public get uuid(): string {
        return this._uuid;
    }

    public set uuid(val: string) {
        if (this._uuid !== val) {
            if (this._uuid !== null) {
                ErrorHandler.logWarning(`Overriding filter UUID ${this._uuid} with ${val}`);
            }
            this._uuid = val;
            this.onModelChanges('uuid');
        }
    }



    private _origin = -1; // container / graph
    public get origin(): number {
        return this._origin;
    }

    public set origin(val: number) {
        if (this._origin !== val) {
            this._origin = val;
            this.onModelChanges('origin');
        }
    }


    private _path: [number, number][];
    public get path(): [number, number][] {
        return this._path;
    }

    public set path(val: [number, number][]) {
        this._path = val;
        this.boundingRect = PointUtils.buildBoundingRect(val);
        this.onModelChanges('path');
    }


    private _selectedBy: number[] = [];
    public get selectedBy(): number[] {
        return this._selectedBy;
    }

    public set selectedBy(val: number[]) {
        if (!_.isEqual(this._selectedBy, val)) {
            this._selectedBy = val;
            this.onModelChanges('selectedBy');
        }
    }


    private _color = '#2196F3';
    public get color(): string {
        return this._color;
    }

    public set color(val: string) {
        if (this._color !== val) {
            this._color = val;
            this.updateColor();
            this.onModelChanges('color');
        }
    }

    private _axisX: string = null;
    public get axisX(): string {
        return this._axisX;
    }

    public set axisX(val: string) {
        if (this._axisX !== val) {
            this._axisX = val;
            this.onModelChanges('axisX');
        }
    }


    private _axisY: string = null;
    public get axisY(): string {
        return this._axisY;
    }

    public set axisY(val: string) {
        if (this._axisY !== val) {
            this._axisY = val;
            this.onModelChanges('axisY');
        }
    }


    private _boundAxis = 'xy';
    public get boundAxis(): string {
        return this._boundAxis;
    }

    public set boundAxis(val: string) {
        if (this._boundAxis !== val) {
            this._boundAxis = val;
            this.onModelChanges('boundAxis');
        }
    }


    private _isBeingCreatedBy = -1;
    public get isBeingCreatedBy(): number {
        return this._isBeingCreatedBy;
    }

    public set isBeingCreatedBy(val: number) {
        if (this._isBeingCreatedBy !== val) {
            this._isBeingCreatedBy = val;
            this.onModelChanges('isBeingCreatedBy');
        }
    }


    // local only
    public readonly includes = new BehaviorSubject<number[]>([]);
    public boundingRect: [number, number][] = [];
    public dataColors: Color[] = [ { r: 255, g: 255, b: 255, a: 255 } ];

    public constructor(dbColumns: string[]) {
        super(dbColumns);
        this.includes.subscribe(() => Filter.IncludeSubject.next(this));

        this.dbInitialization.toPromise().then(() => {
            this.updateColor();
            this.boundingRect = PointUtils.buildBoundingRect(this._path);
        });
    }


    public delete(): void {
        super.delete();
        this.includes.complete();
    }


    private updateColor(): void {
        if (!this.color) {
            return;
        }

        if (this.color.startsWith('#')) {
            this.dataColors = [Utils.hexToRgb(this.color)];
        } else if (this.color.startsWith('g')) {
            const cols = this.color.split(':').slice(1);
            this.dataColors = [];
            for (const c of cols) {
                this.dataColors.push(Utils.hexToRgb(c));
            }
        } else {
            console.error(`Unknown color ${this.color}`);
        }
    }
}

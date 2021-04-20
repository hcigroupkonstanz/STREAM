import * as _ from 'lodash';
import { SqlSerializable } from '../database';

export class Plot extends SqlSerializable {
    public static DEFAULT_POSITIONING_OFFSET = 2;
    public static readonly TableName = 'plots';
    public static readonly TableArgs = [
        'id INTEGER PRIMARY KEY',
        'color varchar(255) DEFAULT "#FFFFFF"',
        'position varchar(255) DEFAULT "[0, 0, 0]"',
        'rotation varchar(255) DEFAULT "[0, 0, 0, 1]"',
        'dimX varchar(255)',
        'dimY varchar(255)',
        'aggregationLevel INT DEFAULT 0',
        'useFilter INT DEFAULT 1',
        'useColor INT DEFAULT 0',
        'useSort INT DEFAULT 0'
    ];



    private _color = '#FFFFFF';
    public get color(): string {
        return this._color;
    }

    public set color(val: string) {
        if (this._color !== val) {
            this._color = val;
            this.onModelChanges('color');
        }
    }


    private _boundTo = -1;
    public get boundTo(): number {
        return this._boundTo;
    }

    public set boundTo(val: number) {
        if (this._boundTo !== val) {
            this._boundTo = val;
            this.onModelChanges('boundTo');
        }
    }


    private _lockedToAxis = false;
    public get lockedToAxis(): boolean {
        return this._lockedToAxis;
    }

    public set lockedToAxis(val: boolean) {
        if (this._lockedToAxis !== val) {
            this._lockedToAxis = val;
            this.onModelChanges('lockedToAxis');
        }
    }

    private _position: [number, number, number] = [0, 0, 0];
    public get position(): [number, number, number] {
        return this._position;
    }

    public set position(val: [number, number, number]) {
        if (!_.isEqual(this._position, val)) {
            this._position = val;
            this.onModelChanges('position');
        }
    }


    private _rotation: [number, number, number, number] = [0, 0, 0, 1];
    public get rotation(): [number, number, number, number] {
        return this._rotation;
    }

    public set rotation(val: [number, number, number, number]) {
        if (!_.isEqual(this._rotation, val)) {
            this._rotation = val;
            this.onModelChanges('rotation');
        }
    }



    private _dimX: string | null = null;
    public get dimX(): string | null {
        return this._dimX;
    }

    public set dimX(val: string | null) {
        if (this._dimX !== val) {
            this._dimX = val;
            this.onModelChanges('dimX');
        }
    }



    private _dimY: string | null = null;
    public get dimY(): string | null {
        return this._dimY;
    }

    public set dimY(val: string | null) {
        if (this._dimY !== val) {
            this._dimY = val;
            this.onModelChanges('dimY');
        }
    }



    private _positioningOffset: number = Plot.DEFAULT_POSITIONING_OFFSET;
    public get positioningOffset(): number {
        return this._positioningOffset;
    }

    public set positioningOffset(val: number) {
        if (this._positioningOffset !== val) {
            this._positioningOffset = val;
            this.onModelChanges('positioningOffset');
        }
    }



    private _aggregationLevel = 0;
    public get aggregationLevel(): number {
        return this._aggregationLevel;
    }

    public set aggregationLevel(val: number) {
        if (this._aggregationLevel !== val) {
            this._aggregationLevel = val;
            this.onModelChanges('aggregationLevel');
        }
    }


    private _useColor = false;
    public get useColor(): boolean {
        return this._useColor;
    }

    public set useColor(val: boolean) {
        if (this._useColor !== val) {
            this._useColor = val;
            this.onModelChanges('useColor');
        }
    }


    private _useSort = false;
    public get useSort() {
        return this._useSort;
    }

    public set useSort(val: boolean) {
        if (this._useSort !== val) {
            this._useSort = val;
            this.onModelChanges('useSort');
        }
    }


    private _useFilter = true;
    public get useFilter(): boolean {
        return this._useFilter;
    }

    public set useFilter(val: boolean) {
        if (this._useFilter !== val) {
            this._useFilter = val;
            this.onModelChanges('useFilter');
        }
    }


    // [id, posX, posY, isFiltered]
    private _data: [number, number, number, number][] = [];
    public set data(val: [number, number, number, number][]) {
        if (this._data !== val) {
            this._data = val;
            this.onModelChanges('data');
        }
    }

    public get data() {
        return this._data;
    }



    // [data_id, [original_contained_ids]] - for aggregations
    // e.g.: [1, [1]] when no aggregation,
    // [1, [1,2,3,4,5]] for aggregations
    private _idMapping: [number, number[]][] = [];
    public set idMapping(val: [number, number[]][]) {
        if (this._idMapping !== val) {
            this._idMapping = val;
            this.onModelChanges('idMapping');
        }
    }

    public get idMapping() {
        return this._idMapping;
    }




    public updateData(): void {
        this.onModelChanges('data');
    }

}

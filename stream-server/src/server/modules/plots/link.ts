import * as _ from 'lodash';
import { SqlSerializable } from '../database';

export class Link extends SqlSerializable {

    public static readonly TableName = 'links';
    public static readonly TableArgs = [
        'id INTEGER PRIMARY KEY',
        'upstream INTEGER DEFAULT -1',
        'downstream INTEGER DEFAULT -1',
        'useColor INT DEFAULT 0',
        'useSort INT DEFAULT 0'
    ];


    private _upstream = -1;
    public get upstream() {
        return this._upstream;
    }

    public set upstream(val: number) {
        if (this._upstream !== val) {
            this._upstream = val;
            this.onModelChanges('upstream');
        }
    }

    private _downstream = -1;
    public get downstream() {
        return this._downstream;
    }

    public set downstream(val: number) {
        if (this._downstream !== val) {
            this._downstream = val;
            this.onModelChanges('downstream');
        }
    }

    // only temporary, if _up or _downstream == -1
    private _placingPosition: [number, number, number] = [0, 0, 0];
    public get placingPosition() {
        return this._placingPosition;
    }

    public set placingPosition(val: [number, number, number]) {
        if (!_.isEqual(this._placingPosition, val)) {
            this._placingPosition = val;
            this.onModelChanges('placingPosition');
        }
    }


    private _placingRotation: [number, number, number, number] = [0, 0, 0, 1];
    public get placingRotation() {
        return this._placingRotation;
    }

    public set placingRotation(val: [number, number, number, number]) {
        if (!_.isEqual(this._placingRotation, val)) {
            this._placingRotation = val;
            this.onModelChanges('placingRotation');
        }
    }


    private _createdBy = -1;
    public get createdBy() {
        return this._createdBy;
    }

    public set createdBy(val: number) {
        if (this._createdBy !== val) {
            this._createdBy = val;
            this.onModelChanges('createdBy');
        }
    }


    private _useColor = false;
    public get useColor() {
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
}

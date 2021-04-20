import { SqlSerializable } from '../database';

export class OriginPoint extends SqlSerializable {
    public static readonly TableName = 'origin_point';
    public static readonly TableArgs = [
        'id INTEGER PRIMARY KEY',
        'position varchar(255) DEFAULT "[0,0,0]"',
        'rotation varchar(255) DEFAULT "[0,0,0,1]"',
    ];

    private _rotation = [0, 0, 0, 1];
    public get rotation(): number[] {
        return this._rotation;
    }

    public set rotation(val: number[]) {
        this._rotation = val;
        this.onModelChanges('rotation');
    }

    private _position = [0, 0, 0];
    public get position(): number[] {
        return this._position;
    }

    public set position(val: number[]) {
        this._position = val;
        this.onModelChanges('position');
    }
}

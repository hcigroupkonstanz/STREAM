import { SqlSerializable } from '../database';

export class Tracker extends SqlSerializable {
    public static readonly TableName = 'vivetrackers';
    public static readonly TableArgs = [
        'id INTEGER PRIMARY KEY',
        'hardwareId varchar(255) NOT NULL',
        'name varchar(255) DEFAULT ""',
    ];


    private _hardwareId = '';
    public get hardwareId(): string {
        return this._hardwareId;
    }

    public set hardwareId(val: string) {
        if (!this._hardwareId) {
            this._hardwareId = val;
            this.onModelChanges('hardwareId');
        }
    }



    private _name = '';
    public get name(): string {
        return this._name;
    }

    public set name(val: string) {
        if (this._name !== val) {
            this._name = val;
            this.onModelChanges('name');
        }
    }


    private _position = [0, 0, 0];
    public get position(): number[] {
        return this._position;
    }

    public set position(val: number[]) {
        if (this._position !== val) {
            this._position = val;
            this.onModelChanges('position');
        }
    }




    private _rotation = [0, 0, 0, 1];
    public get rotation(): number[] {
        return this._rotation;
    }

    public set rotation(val: number[]) {
        if (this._rotation !== val) {
            this._rotation = val;
            this.onModelChanges('rotation');
        }
    }



    private _isActive = false;
    public get isActive(): boolean {
        return this._isActive;
    }

    public set isActive(val: boolean) {
        if (this._isActive !== val) {
            this._isActive = val;
            this.onModelChanges('isActive');
        }
    }
}

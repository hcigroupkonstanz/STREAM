import { SqlSerializable } from '../database';

const IDENTITY_MATRIX = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
];

export class UnityClient extends SqlSerializable {
    public static readonly TableName = 'unityclients';
    public static readonly TableArgs = [
        'id INTEGER PRIMARY KEY',
        'name varchar(255)',
        'type varchar(64)',
        `offsetMatrix text DEFAULT "${JSON.stringify(IDENTITY_MATRIX)}"`,
        'placementHeightOffset FLOAT DEFAULT 0'
    ];


    private _name: string;
    public get name(): string {
        return this._name;
    }

    public set name(val: string) {
        if (this._name !== val) {
            this._name = val;
            this.onModelChanges('name');
        }
    }



    private _debugIndicators = false;
    public get debugIndicators(): boolean {
        return this._debugIndicators;
    }
    public set debugIndicators(val: boolean) {
        if (this._debugIndicators !== val) {
            this._debugIndicators = val;
            this.onModelChanges('debugIndicators');
        }
    }



    public _type: 'ar' | 'tracker';
    public get type(): 'ar' | 'tracker' {
        return this._type;
    }

    public set type(val: 'ar' | 'tracker') {
        if (this._type !== val) {
            this._type = val;
            this.onModelChanges('type');
        }
    }


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


    private _offsetMatrix = IDENTITY_MATRIX;
    public get offsetMatrix(): number[] {
        return this._offsetMatrix;
    }

    public set offsetMatrix(val: number[]) {
        if (this._offsetMatrix !== val) {
            this._offsetMatrix = val;
            this.onModelChanges('offsetMatrix');
        }
    }

    private _isCalibrating = false;
    public get isCalibrating(): boolean {
        return this._isCalibrating;
    }

    public set isCalibrating(val: boolean) {
        if (this._isCalibrating !== val) {
            this._isCalibrating = val;
            this.onModelChanges('isCalibrating');
        }
    }


    private _selectedType = '';
    public get selectedType(): string {
        return this._selectedType;
    }

    public set selectedType(val: string) {
        if (this._selectedType !== val) {
            this._selectedType = val;
            this.onModelChanges('selectedType');
        }
    }


    private _selectedId = -1;
    public get selectedId(): number {
        return this._selectedId;
    }

    public set selectedId(val: number) {
        if (this._selectedId !== val) {
            this._selectedId = val;
            this.onModelChanges('selectedId');
        }
    }


    private _selectedMetadata = '';
    public get selectedMetadata(): string {
        return this._selectedMetadata;
    }

    public set selectedMetadata(val: string) {
        if (this._selectedMetadata !== val) {
            this._selectedMetadata = val;
            this.onModelChanges('selectedMetadata');
        }
    }


    private _lookingAtType = '';
    public get lookingAtType(): string {
        return this._lookingAtType;
    }

    public set lookingAtType(val: string) {
        if (this._lookingAtType !== val) {
            this._lookingAtType = val;
            this.onModelChanges('lookingAtType');
        }
    }


    private _lookingAtId = -1;
    public get lookingAtId(): number {
        return this._lookingAtId;
    }

    public set lookingAtId(val: number) {
        if (this._lookingAtId !== val) {
            this._lookingAtId = val;
            this.onModelChanges('lookingAtId');
        }
    }



    private _placementHeightOffset = 0;
    public get placementHeightOffset(): number {
        return this._placementHeightOffset;
    }

    public set placementHeightOffset(val: number) {
        if (this._placementHeightOffset !== val) {
            this._placementHeightOffset = val;
            this.onModelChanges('placementHeightOffset');
        }
    }



    private _indicatorPosition = 'cursor';
    public get indicatorPosition(): string {
        return this._indicatorPosition;
    }

    public set indicatorPosition(val: string) {
        if (this._indicatorPosition !== val) {
            this._indicatorPosition = val;
            this.onModelChanges('indicatorPosition');
        }
    }



    private _zenMode = false;
    public get zenMode(): boolean {
        return this._zenMode;
    }

    public set zenMode(val: boolean) {
        if (this._zenMode !== val) {
            this._zenMode = val;
            this.onModelChanges('zenMode');
        }
    }



    private _selectionProgress = -1;
    public get selectionProgress(): number {
        return this._selectionProgress;
    }

    public set selectionProgress(val: number) {
        if (this._selectionProgress !== val) {
            this._selectionProgress = val;
            this.onModelChanges('selectionProgress');
        }
    }


    private _isObserver = false;
    public get isObserver(): boolean {
        return this._isObserver;
    }

    public set isObserver(val: boolean) {
        if (this._isObserver !== val) {
            this._isObserver = val;
            this.onModelChanges('isObserver');
        }
    }
}

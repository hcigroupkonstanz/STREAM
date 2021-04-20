import { ObservableModel } from './observable-model';

export class Plot extends ObservableModel {
    private _color: string;
    public get color(): string {
        return this._color;
    }

    public set color(val: string) {
        if (this._color !== val) {
            this._color = val;
            this.modelChanges.next('color');
        }
    }


    private _boundTo: number;
    public get boundTo(): number {
        return this._boundTo;
    }

    public set boundTo(val: number) {
        if (this._boundTo !== val) {
            this._boundTo = val;
            this.modelChanges.next('boundTo');
        }
    }


    private _position: [number, number, number];
    public get position(): [number, number, number] {
        return this._position;
    }

    public set position(val: [number, number, number]) {
        if (this._position !== val) {
            this._position = val;
            this.modelChanges.next('position');
        }
    }


    private _rotation: [number, number, number, number];
    public get rotation(): [number, number, number, number] {
        return this._rotation;
    }

    public set rotation(val: [number, number, number, number]) {
        if (this._rotation !== val) {
            this._rotation = val;
            this.modelChanges.next('rotation');
        }
    }


    private _dimX: string | null;
    public get dimX(): string | null {
        return this._dimX;
    }

    public set dimX(val: string | null) {
        if (this._dimX !== val) {
            this._dimX = val;
            this.modelChanges.next('dimX');
        }
    }


    private _dimY: string | null;
    public get dimY(): string | null {
        return this._dimY;
    }

    public set dimY(val: string | null) {
        if (this._dimY !== val) {
            this._dimY = val;
            this.modelChanges.next('dimY');
        }
    }


    private _positioningOffset: number;
    public get positioningOffset(): number {
        return this._positioningOffset;
    }

    public set positioningOffset(val: number) {
        if (this._positioningOffset !== val) {
            this._positioningOffset = val;
            this.modelChanges.next('positioningOffset');
        }
    }



    private _lockedToAxis = false;
    public get lockedToAxis(): boolean {
        return this._lockedToAxis;
    }

    public set lockedToAxis(val: boolean) {
        if (this._lockedToAxis !== val) {
            this._lockedToAxis = val;
            this.modelChanges.next('lockedToAxis');
        }
    }

    private _aggregationLevel = 0;
    public get aggregationLevel(): number {
        return this._aggregationLevel;
    }

    public set aggregationLevel(val: number) {
        if (this._aggregationLevel !== val) {
            this._aggregationLevel = val;
            this.modelChanges.next('aggregationLevel');
        }
    }

    private _useFilter = true;
    public get useFilter(): boolean {
        return this._useFilter;
    }

    public set useFilter(val: boolean) {
        if (this._useFilter !== val) {
            this._useFilter = val;
            this.modelChanges.next('useFilter');
        }
    }



    private _useSort = false;
    public get useSort() {
        return this._useSort;
    }

    public set useSort(val: boolean) {
        if (this._useSort !== val) {
            this._useSort = val;
            this.modelChanges.next('useSort');
        }
    }


    private _useColor = false;
    public get useColor(): boolean {
        return this._useColor;
    }

    public set useColor(val: boolean) {
        if (this._useColor !== val) {
            this._useColor = val;
            this.modelChanges.next('useColor');
        }
    }


    private _data: [number, number, number][];
    public get data(): [number, number, number][] {
        return this._data;
    }
}

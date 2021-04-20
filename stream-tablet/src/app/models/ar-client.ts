import { ObservableModel } from './observable-model';

export class ArClient extends ObservableModel {
    private _name: string;
    public get name(): string {
        return this._name;
    }

    public set name(val: string) {
        if (this._name !== val) {
            this._name = val;
            this.modelChanges.next('name');
        }
    }

    private _selectedType = '';
    public get selectedType(): string {
        return this._selectedType;
    }

    public set selectedType(val: string) {
        if (this._selectedType !== val) {
            this._selectedType = val;
            this.modelChanges.next('selectedType');
        }
    }


    private _selectedId = -1;
    public get selectedId(): number {
        return this._selectedId;
    }

    public set selectedId(val: number) {
        if (this._selectedId !== val) {
            this._selectedId = val;
            this.modelChanges.next('selectedId');
        }
    }


    private _selectedMetadata = '';
    public get selectedMetadata(): string {
        return this._selectedMetadata;
    }

    public set selectedMetadata(val: string) {
        if (this._selectedMetadata !== val) {
            this._selectedMetadata = val;
            this.modelChanges.next('selectedMetadata');
        }
    }


    private _lookingAtType = '';
    public get lookingAtType(): string {
        return this._lookingAtType;
    }

    public set lookingAtType(val: string) {
        if (this._lookingAtType !== val) {
            this._lookingAtType = val;
            this.modelChanges.next('lookingAtType');
        }
    }


    private _lookingAtId = -1;
    public get lookingAtId(): number {
        return this._lookingAtId;
    }

    public set lookingAtId(val: number) {
        if (this._lookingAtId !== val) {
            this._lookingAtId = val;
            this.modelChanges.next('lookingAtId');
        }
    }


    private _placementHeightOffset = 0;
    public get placementHeightOffset(): number {
        return this._placementHeightOffset;
    }

    public set placementHeightOffset(val: number) {
        if (this._placementHeightOffset !== val) {
            this._placementHeightOffset = val;
            this.modelChanges.next('placementHeightOffset');
        }
    }



    private _indicatorPosition: string;
    public get indicatorPosition(): string {
        return this._indicatorPosition;
    }

    public set indicatorPosition(val: string) {
        if (this._indicatorPosition !== val) {
            this._indicatorPosition = val;
            this.modelChanges.next('indicatorPosition');
        }
    }



    private _zenMode = false;
    public get zenMode(): boolean {
        return this._zenMode;
    }

    public set zenMode(val: boolean) {
        if (this._zenMode !== val) {
            this._zenMode = val;
            this.modelChanges.next('zenMode');
        }
    }


    private _selectionProgress = 0;
    public get selectionProgress(): number {
        return this._selectionProgress;
    }

    public set selectionProgress(val: number) {
        if (this._selectionProgress !== val) {
            this._selectionProgress = val;
            this.modelChanges.next('selectionProgress');
        }
    }
}

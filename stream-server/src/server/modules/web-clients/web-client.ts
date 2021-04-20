import * as _ from 'lodash';
import { SqlSerializable } from '../database';

export type DeviceOrientation = 'horizontal' | 'vertical';

const IDENTITY_MATRIX = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
];

export class WebClient extends SqlSerializable {
    public static readonly TableName = 'webclients';
    public static readonly TableArgs = [
        'id INTEGER PRIMARY KEY',
        'name varchar(255) NOT NULL',
        'resolutionWidth INTEGER DEFAULT 2048',
        'resolutionHeight INTEGER DEFAULT 1536',
        'owner INTEGER DEFAULT -1',
        'ppi REAL DEFAULT 264',
        'trackers text DEFAULT "[-1]"',
        `offsetMatrices text DEFAULT "${JSON.stringify([IDENTITY_MATRIX])}"`,
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


    // default values:  iPad Air
    private _resolutionWidth = 2048;
    public get resolutionWidth(): number {
        return this._resolutionWidth;
    }

    public set resolutionWidth(val: number) {
        if (this._resolutionWidth !== val) {
            this._resolutionWidth = val;
            this.onModelChanges('resolutionWidth');
        }
    }


    private _resolutionHeight = 1536;
    public get resolutionHeight(): number {
        return this._resolutionHeight;
    }

    public set resolutionHeight(val: number) {
        if (this._resolutionHeight !== val) {
            this._resolutionHeight = val;
            this.onModelChanges('resolutionHeight');
        }
    }


    private _ppi = 264;
    public get ppi(): number {
        return this._ppi;
    }

    public set ppi(val: number) {
        if (this._ppi !== val) {
            this._ppi = val;
            this.onModelChanges('ppi');
        }
    }



    public _trackers = [-1];
    public get trackers() {
        return this._trackers;
    }

    public set trackers(val: number[]) {
        if (!_.isEqual(this._trackers, val)) {
            this._trackers = val;
            this.onModelChanges('trackers');

            // reset offsetMatrices
            const offsetMatrices = [];
            for (const tracker of this._trackers) {
                offsetMatrices.push(IDENTITY_MATRIX);
            }
            this.offsetMatrices = offsetMatrices;
        }
    }



    public _owner = -1;
    public get owner() {
        return this._owner;
    }

    public set owner(val: number) {
        if (this._owner !== val) {
            this._owner = val;
            this.onModelChanges('owner');
        }
    }



    private _offsetMatrices = [IDENTITY_MATRIX];
    public get offsetMatrices(): number[][] {
        return this._offsetMatrices;
    }

    public set offsetMatrices(val: number[][]) {
        if (this._offsetMatrices !== val) {
            this._offsetMatrices = val;
            this.onModelChanges('offsetMatrices');
        }
    }


    private _orientation: DeviceOrientation = 'horizontal';
    public get orientation(): DeviceOrientation {
        return this._orientation;
    }

    public set orientation(val: DeviceOrientation) {
        if (this._orientation !== val) {
            this._orientation = val;
            this.onModelChanges('orientation');
        }
    }



    private _isVoiceActive = false;
    public get isVoiceActive(): boolean {
        return this._isVoiceActive;
    }

    public set isVoiceActive(val: boolean) {
        if (this._isVoiceActive !== val) {
            this._isVoiceActive = val;
            this.onModelChanges('isVoiceActive');
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


    private _lookingAtType: string;
    public get lookingAtType(): string {
        return this._lookingAtType;
    }

    public set lookingAtType(val: string) {
        if (this._lookingAtType !== val) {
            this._lookingAtType = val;
            this.onModelChanges('lookingAtType');
        }
    }


    private _lookingAtId: number;
    public get lookingAtId(): number {
        return this._lookingAtId;
    }

    public set lookingAtId(val: number) {
        if (this._lookingAtId !== val) {
            this._lookingAtId = val;
            this.onModelChanges('lookingAtId');
        }
    }


    private _screenMenu: any = { options: [], selectedMenu: '' };
    public get screenMenu(): any {
        return this._screenMenu;
    }

    public set screenMenu(val: any) {
        if (this._screenMenu !== val) {
            this._screenMenu = val;
            this.onModelChanges('screenMenu');
        }
    }
}

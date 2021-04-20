import * as _ from 'lodash';
import { ObservableModel } from './observable-model';

const PROP_NAME = 'prop_client_name';

export type DeviceOrientation = 'horizontal' | 'vertical' | 'inbetween';

export interface ScreenMenu {
    topleft?: ScreenMenuItem;
    topright?: ScreenMenuItem;
    left?: ScreenMenuItem;
    center?: ScreenMenuItem;
    right?: ScreenMenuItem;
    bottomleft?: ScreenMenuItem;
    bottomright?: ScreenMenuItem;
    top?: ScreenMenuItem;
    bottom?: ScreenMenuItem;

    options: ScreenMenuItem[];
    selectedMenu: string;
    selectedMenuArgs?: any;
    hide: boolean;
}

export interface ScreenMenuItem {
    icon: string;
    action: string;
    actionName: string;
    voice: string; // voice keyword
    voiceName: string; // actionName with unity markup for voice activation
    metadata: any;
}

export class WebClient extends ObservableModel {

    public static ScreenMenuPositions = [
        'topleft', 'topright', 'left', 'center', 'right', 'bottomleft', 'bottomright', 'top', 'bottom'
    ];


    private static _instance = new WebClient();
    public static get Instance(): WebClient {
        return WebClient._instance;
    }

    private _name: string;
    public get name(): string {
        return this._name;
    }

    public set name(val: string) {
        if (this._name !== val) {
            this._name = val;
            localStorage.setItem(PROP_NAME, val);
            this.modelChanges.next('name');
        }
    }



    // default values: iPad Air
    private _resolutionWidth = 2048;
    public get resolutionWidth(): number {
        return this._resolutionWidth;
    }

    public set resolutionWidth(val: number) {
        if (this._resolutionWidth !== val) {
            this._resolutionWidth = val;
            this.modelChanges.next('resolutionWidth');
        }
    }


    private _resolutionHeight = 1536;
    public get resolutionHeight(): number {
        return this._resolutionHeight;
    }

    public set resolutionHeight(val: number) {
        if (this._resolutionHeight !== val) {
            this._resolutionHeight = val;
            this.modelChanges.next('resolutionHeight');
        }
    }


    private _ppi = 264;
    public get ppi(): number {
        return this._ppi;
    }

    public set ppi(val: number) {
        if (this._ppi !== val) {
            this._ppi = val;
            this.modelChanges.next('ppi');
        }
    }




    private _trackers: ReadonlyArray<number> = [-1];
    public get trackers(): ReadonlyArray<number> {
        return this._trackers;
    }

    public set trackers(val: ReadonlyArray<number>) {
        if (!_.isEqual(this._trackers, val)) {
            this._trackers = val;
            this.modelChanges.next('trackers');
        }
    }


    public _owner: number;
    public get owner() {
        return this._owner;
    }

    public set owner(val: number) {
        if (this._owner !== val) {
            this._owner = val;
            this.modelChanges.next('owner');
        }
    }



    private _isVoiceActive = false;
    public get isVoiceActive(): boolean {
        return this._isVoiceActive;
    }

    public set isVoiceActive(val: boolean) {
        if (this._isVoiceActive !== val) {
            this._isVoiceActive = val;
            this.modelChanges.next('isVoiceActive');
        }
    }



    private _isCalibrating = false;
    public get isCalibrating(): boolean {
        return this._isCalibrating;
    }

    public set isCalibrating(val: boolean) {
        if (this._isCalibrating !== val) {
            this._isCalibrating = val;
            this.modelChanges.next('isCalibrating');
        }
    }


    private _orientation: DeviceOrientation;
    public get orientation(): DeviceOrientation {
        return this._orientation;
    }

    public set orientation(val: DeviceOrientation) {
        if (this._orientation !== val) {
            this._orientation = val;
            this.modelChanges.next('orientation');
        }
    }



    private _lookingAtType: string;
    public get lookingAtType(): string {
        return this._lookingAtType;
    }

    public set lookingAtType(val: string) {
        if (this._lookingAtType !== val) {
            this._lookingAtType = val;
            this.modelChanges.next('lookingAtType');
        }
    }


    private _lookingAtId: number;
    public get lookingAtId(): number {
        return this._lookingAtId;
    }

    public set lookingAtId(val: number) {
        if (this._lookingAtId !== val) {
            this._lookingAtId = val;
            this.modelChanges.next('lookingAtId');
        }
    }



    private _prevScreenMenu: ScreenMenu = { options: [], selectedMenu: '', hide: false };
    private _screenMenu: ScreenMenu = { options: [], selectedMenu: '', hide: false };
    public get screenMenu(): ScreenMenu {
        return this._screenMenu;
    }

    public set screenMenu(val: ScreenMenu) {
        if (!_.isEqual(this._screenMenu, val)) {
            this._screenMenu = val;
            this._prevScreenMenu = _.cloneDeep(val);
            this.modelChanges.next('screenMenu');
        }
    }

    // workaround to avoid monitoring screenmenuitems ...
    public updateScreenMenu(): void {
        if (!_.isEqual(this._prevScreenMenu, this._screenMenu)) {
            this._prevScreenMenu = _.cloneDeep(this._screenMenu);
            this.modelChanges.next('screenMenu');
        }
    }


    private constructor() {
        super();

        const localName = localStorage.getItem(PROP_NAME);
        if (!localName) {
            this.name = Math.floor((1 + Math.random()) * 0x10000).toString(16);
        } else {
            this.name = localName;
        }

        // For debugging
        (<any>window).webclient = this;
    }
}

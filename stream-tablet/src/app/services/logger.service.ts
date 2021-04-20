import { Injectable } from '@angular/core';
import { SocketIO } from './socket-io.service';

import * as _ from 'lodash';
import { NC_LOG } from '../models';

@Injectable({
    providedIn: 'root'
})
export class Logger {

    private readonly consoleDebug: Function;
    private readonly consoleLog: Function;
    private readonly consoleWarn: Function;
    private readonly consoleError: Function;

    // see: https://stackoverflow.com/a/9216488/4090817
    constructor(private socketService: SocketIO) {
        // keep original console commands
        this.consoleDebug = console.debug;
        this.consoleLog = console.log;
        this.consoleWarn = console.warn;
        this.consoleError = console.error;
        const that = this;

        // intercept calls from console
        console.debug = function() {
            that.consoleDebug.apply(this, Array.prototype.slice.call(arguments));
            socketService.send(NC_LOG, 'debug', ''.concat(..._.map(arguments, a => `${a} `)).trim());
        };
        console.log = function() {
            that.consoleLog.apply(this, Array.prototype.slice.call(arguments));
            socketService.send(NC_LOG, 'info', ''.concat(..._.map(arguments, a => `${a} `)).trim());
        };
        console.warn = function() {
            that.consoleWarn.apply(this, Array.prototype.slice.call(arguments));
            socketService.send(NC_LOG, 'warning', ''.concat(..._.map(arguments, a => `${a} `)).trim());
        };
        console.error = function() {
            that.consoleError.apply(this, Array.prototype.slice.call(arguments));
            socketService.send(NC_LOG, 'error', ''.concat(..._.map(arguments, a => `${a} `)).trim());
        };
    }

    debug(msg: any) {
        this.consoleDebug(`[DEBUG] ${msg}`);
        this.socketService.send(NC_LOG, 'debug', msg);
    }

    log(msg: any) {
        this.consoleLog(`[LOG] ${msg}`);
        this.socketService.send(NC_LOG, 'info', msg);
    }

    warn(msg: any) {
        this.consoleWarn(`[WARNING] ${msg}`);
        this.socketService.send(NC_LOG, 'warning', msg);
    }

    error(msg: any) {
        this.consoleError(`[ERROR] ${msg}`);
        this.socketService.send(NC_LOG, 'error', msg);
    }
}

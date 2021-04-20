import { SocketIO } from './socket-io.service';
import { Injectable } from '@angular/core';
import { NC_CONTROL } from '../models';

@Injectable({
    providedIn: 'root'
})
export class RemoteRestartService {

    constructor(socketIO: SocketIO) {
        socketIO.on(NC_CONTROL, (cmd, payload) => {
            if (cmd === 'restart') {
                window.location.href = '/live';
            }
        });
    }
}

import { SqliteDatabaseProxy } from './../database';
import { UnityServerProxy } from '../unity';
import { Service, Message } from '../core';
import { SocketIOServer } from '../web-clients';
import { Subject } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';

export const INCOMING_NETWORKING_TABLE_NAME = 'networking_incoming';
const TABLE_ARGS = [
    'id INTEGER PRIMARY KEY',
    'origin varchar(32)',
    'name varchar(255)',
    'created INTEGER',
    'data TEXT'
];

export class WriteIncomingNetworkingToDb extends Service {
    public serviceName = 'InMsgLogger';
    public groupName = 'arts';

    private logMessages = new Subject<any>();

    public constructor(
        private db: SqliteDatabaseProxy,
        private unityServer: UnityServerProxy,
        private socketio: SocketIOServer) {
        super();
    }

    public init() {
        super.init();

        this.db.initTable(INCOMING_NETWORKING_TABLE_NAME, TABLE_ARGS);

        this.unityServer.arMessages$
            .subscribe(msg => this.saveMessage('ar', msg.origin.name, msg));

        this.unityServer.trackingMessages$
            .subscribe(msg => this.saveMessage('tracker', msg.origin.name, msg));

        this.socketio.messages$
            .subscribe(msg => this.saveMessage('web', msg.origin.name, msg));

        const keys = [ 'origin', 'name', 'created', 'data' ];
        const valueNames = keys.map(k => `"${k}"`).join(', ');
        const valueBindings = keys.map(k => `@${k}`).join(', ');
        const table = INCOMING_NETWORKING_TABLE_NAME;
        this.logMessages
            .pipe(bufferTime(2000), filter(logs => logs.length > 0))
            .subscribe(logs => this.db.bulk(`INSERT INTO ${table} (${valueNames}) VALUES (${valueBindings})`, logs));
    }


    private saveMessage(origin: 'ar' | 'tracker' | 'web', name: string, msg: Message): void {
        // cannot use msg parameter because it may contain non-serializable info (i.e. sockets)
        const msgData: Message = {
            channel: msg.channel,
            command: msg.command,
            payload: msg.payload
        };

        this.logMessages.next({
            origin: origin,
            name: name || '',
            created: new Date().getTime(),
            data: JSON.stringify(msgData)
        });
    }
}

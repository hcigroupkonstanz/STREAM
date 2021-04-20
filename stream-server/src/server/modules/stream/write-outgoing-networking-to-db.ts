import { SqliteDatabaseProxy } from '../database';
import { UnityServerProxy } from '../unity';
import { Service, Message } from '../core';
import { SocketIOServer } from '../web-clients';
import { Subject } from 'rxjs';
import { bufferTime, filter } from 'rxjs/operators';

export const OUTGOING_NETWORKING_TABLE_NAME = 'networking_outgoing';
const TABLE_ARGS = [
    'id INTEGER PRIMARY KEY',
    'target varchar(16)',
    'clients TEXT',
    'created INTEGER',
    'data TEXT'
];

export class WriteOutgoingNetworkingToDb extends Service {
    public serviceName = 'OutMsgLogger';
    public groupName = 'stream';

    private logMessages = new Subject<any>();

    public constructor(
        private db: SqliteDatabaseProxy,
        private unityServer: UnityServerProxy,
        private socketio: SocketIOServer) {
        super();
    }

    public init() {
        super.init();

        this.db.initTable(OUTGOING_NETWORKING_TABLE_NAME, TABLE_ARGS);

        this.unityServer.outgoingMessages$
            .subscribe(ev => this.saveMessage('unity', ev.clients, ev.msg));

        this.socketio.outgoingMessages$
            .subscribe(ev => this.saveMessage('web', ev.clients, ev.msg));

        const keys = [ 'target', 'clients', 'created', 'data' ];
        const valueNames = keys.map(k => `"${k}"`).join(', ');
        const valueBindings = keys.map(k => `@${k}`).join(', ');
        const table = OUTGOING_NETWORKING_TABLE_NAME;
        this.logMessages
            .pipe(bufferTime(2000), filter(logs => logs.length > 0))
            .subscribe(logs => this.db.bulk(`INSERT INTO ${table} (${valueNames}) VALUES (${valueBindings})`, logs));
    }


    private saveMessage(target: 'unity' | 'web', clients: number[], msg: Message): void {
        // cannot use msg parameter because it may contain non-serializable info (i.e. sockets)
        const msgData: Message = {
            channel: msg.channel,
            command: msg.command,
            payload: msg.payload
        };

        this.logMessages.next({
            target: target,
            clients: JSON.stringify(clients),
            created: new Date().getTime(),
            data: JSON.stringify(msgData)
        });
    }
}

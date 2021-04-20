import { filter, bufferTime } from 'rxjs/operators';
import { Service, NC_WEBCLIENT_INTERACTION_LOG } from '../core';
import { SocketIOServer } from './socketio-server';
import { SqliteDatabaseProxy } from '../database';
import * as _ from 'lodash';

const TABLE_NAME = 'interaction_log';
const TABLE_ARGS = [
    '"id" INTEGER PRIMARY KEY',
    '"payload" TEXT',
];

export class WebClientInteractionLogger extends Service {

    public get serviceName(): string { return 'WebInteraction'; }
    public get groupName(): string { return 'tangibles'; }

    public constructor(private socketServer: SocketIOServer, private db: SqliteDatabaseProxy) {
        super();
    }

    public init() {
        super.init();

        this.db.initTable(TABLE_NAME, TABLE_ARGS);

        this.socketServer.messages$
            .pipe(filter(m => m.channel === NC_WEBCLIENT_INTERACTION_LOG), bufferTime(600))
            .subscribe(logs => {
                if (logs.length > 0) {
                    const interactionLogs = _.map(logs, l => ({
                        payload: JSON.stringify(l.payload),
                    }));

                    this.db.bulk(`INSERT INTO ${TABLE_NAME} (payload) VALUES (@payload)`, interactionLogs, false);
                }
            });
    }
}

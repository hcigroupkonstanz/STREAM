import { Service } from '../core';
import { SqliteDatabaseProxy } from '../database';
import { merge } from 'rxjs';
import * as _ from 'lodash';
import { bufferTime } from 'rxjs/operators';

export const TABLE_NAME = 'logs';
const TABLE_ARGS = [
    '"id" INTEGER PRIMARY KEY',
    '"origin" varchar(128)',
    '"level" INTEGER',
    '"message" TEXT',
    '"group" varchar(128)',
    '"created" BIGINT' // in unixtime
];

export class WriteLogToDb extends Service {
    public serviceName = 'WriteLogToDb';
    public groupName = 'stream';

    public constructor(private db: SqliteDatabaseProxy) {
        super();
    }

    public init() {
        super.init();

        this.db.initTable(TABLE_NAME, TABLE_ARGS);

        Service.Outputs$
            .pipe(bufferTime(2000))
            .subscribe(logs => {
                if (logs.length > 0) {
                    const keys = _.keys(logs[0]);
                    const valueNames = _.map(keys, k => `"${k}"`).join(', ');
                    const valueBindings = _.map(keys, key => `@${key}`).join(', ');

                    const dbLogs = _.map(logs, l => ({
                        origin: l.origin,
                        level: l.level,
                        message: l.message,
                        group: l.group,
                        created: l.created.getTime()
                    }));

                    this.db.bulk(`INSERT INTO ${TABLE_NAME} (${valueNames}) VALUES (${valueBindings})`, dbLogs, false);
                }
            });
    }
}

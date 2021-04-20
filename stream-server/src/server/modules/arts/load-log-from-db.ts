import { LogMessage } from './../core/log-message';
import { Service } from '../core';
import { SqliteDatabaseProxy } from '../database';
import * as _ from 'lodash';
import { TABLE_NAME } from './write-log-to-db';
import { reduce } from 'rxjs/operators';

export class LoadLogFromDb extends Service {
    public serviceName = 'LoadLogFromDb';
    public groupName = 'arts';

    public constructor(private db: SqliteDatabaseProxy) {
        super();
    }

    public async init() {
        super.init();

        const messages: LogMessage[] = [];

        const hasTable = await this.db.hasTable(TABLE_NAME);
        if (!hasTable) {
            return;
        }

        const results = await this.db.query(`SELECT * FROM ${TABLE_NAME} ORDER BY created DESC LIMIT 1000`, {}).pipe(reduce((acc, val) => acc.concat(val), [])).toPromise();

        for (const result of results) {
            messages.unshift({
                created: new Date(result.created),
                origin: result.origin,
                level: result.level,
                message: result.message,
                group: result.group
            });
        }

        for (const msg of messages) {
            this.outputStream$.next(msg);
        }
    }
}

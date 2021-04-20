import * as _ from 'lodash';
import * as sqlite from 'better-sqlite3';
import { WorkerMessage, WorkerService } from '../core';
import * as cluster from 'cluster';
import * as fs from 'fs';

export const BETTER_SQLITE_WORKER = __filename;

export class BetterSqliteDatabaseWorker extends WorkerService {
    private db: any;
    private dbPath: string;
    private isMemory = false;

    public constructor() {
        super(false);

        // Better TypeScript error messages
        require('source-map-support').install();

        this.parentMessages$.subscribe(async msg => {
            const c = msg.content;
            switch (msg.channel) {
                case 'm:open':
                    this.dbPath = c.dbPath;
                    this.isMemory = c.isMemory;
                    this.open(c.dbPath, c.isMemory);
                    break;

                case 'm:close':
                    this.sendResponse(msg, this.close());
                    break;

                case 'm:backupAndReset':
                    this.sendResponse(msg, await this.backupAndReset());
                    break;

                case 'm:hasTable':
                    this.sendResponse(msg, this.hasTable(c.tablename));
                    break;

                case 'm:initTable':
                    this.initTable(c.tablename, c.columns);
                    break;

                case 'm:bulk':
                    this.bulk(c.statement, c.parameters, c.logErrors);
                    break;

                case 'm:query':
                    this.sendResponse(msg, this.query(c.statement, c.parameters));
                    break;

                case 'm:insert':
                    this.sendResponse(msg, this.insert(c.statement, c.parameters, c.logErrors));
                    break;

                case 'm:run':
                    this.sendResponse(msg, this.run(c.statement, c.parameters));
                    break;
            }
        });
    }

    private sendResponse(msg: WorkerMessage, content: any): void {
        this.postMessage(msg.channel, {
            id: msg.content.id,
            response: content,
            isError: content instanceof Error
        });
    }

    public open(dbPath: string, isMemory: boolean): void {
        try {
            this.db = sqlite(dbPath, {
                fileMustExist: false,
                memory: isMemory,
                readonly: false
            });
        } catch (err) {
            this.logError(JSON.stringify(err));
        }
    }

    public close(): boolean {
        try {
            this.db.close();
        } catch (err) {
            this.logError(JSON.stringify(err));
        }

        return true;
    }

    public async backupAndReset() {
        this.close();

        if (!this.isMemory) {
            const backupName = `${this.dbPath}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`;
            this.logDebug(`Renaming DB to ${backupName}`);
            await fs.promises.rename(this.dbPath, backupName);
        }

        this.open(this.dbPath, this.isMemory);
        return true;
    }


    public hasTable(tablename: string): boolean {
        const statement = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tablename}'`;

        const result = this.query(statement, {});
        return result && result.length >= 1 && result[0].name === tablename;
    }

    public initTable(tablename: string, columns: string[]): void {
        const statement = `CREATE TABLE IF NOT EXISTS ${tablename} (${_.join(columns, ', ')})`;

        try {
            this.db.exec(statement);
        } catch (e) {
            this.logError(`Unable to create ${tablename}`);
            this.logError(e.message);
        }
    }


    public bulk(statement: string, parameters: any[], logErrors = true): any {
        try {
            const sqlStatement = this.db.prepare(statement);

            const transaction = this.db.transaction(vals => {
                for (const val of vals) {
                    sqlStatement.run(val);
                }
            });

            return transaction(parameters);
        } catch (err) {
            if (logErrors) {
                this.logError(`Unable to insert '${statement}' with params ${JSON.stringify(parameters)}`);
                this.logError(err.message);
            }

            return err;
        }
    }

    public query(statement: string, parameters: any): any | Error {
        try {
            return this.db
                .prepare(statement)
                .all(parameters);
        } catch (err) {
            this.logError(`Unable to get '${statement}' with params ${JSON.stringify(parameters)}`);
            this.logError(err.message);
            return err;
        }
    }

    public insert(statement: string, parameters: any, logErrors = true): number | Error {
        try {
            const result: any = this.db
                .prepare(statement)
                .run(parameters);

            const insertedId = <number>result.lastInsertRowid;
            return insertedId;

        } catch (err) {
            if (logErrors) {
                this.logError(`Unable to insert '${statement}' with params ${JSON.stringify(parameters)}`);
                this.logError(err.message);
            }

            return err;
        }
    }


    public run(query: string, parameters: any): void {
        try {
            const statements = query.split(';').map(s => s.trim()).filter(s => !!s);
            for (const statement of statements) {
                this.db
                    .prepare(statement)
                    .run(parameters);
            }

        } catch (err) {
            this.logError(`Unable to execute '${query}' with params ${JSON.stringify(parameters)}`);
            this.logError(err.message);
        }
    }

}



if (cluster.isWorker) {
    const sqliteWorker = new BetterSqliteDatabaseWorker();
}

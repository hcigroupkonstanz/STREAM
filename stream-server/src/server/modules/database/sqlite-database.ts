import { Observable, Subject, of, from } from 'rxjs';
import * as sqlite from 'better-sqlite3';
import * as _ from 'lodash';
import { Database } from './database';

export class SqliteDatabase extends Database {
    public static readonly MEMORY_DB = '[Memory]';
    public get serviceName(): string { return 'SQLite'; }
    public get groupName(): string { return 'db'; }

    private db: any;

    public constructor() {
        super();
    }

    public open(dbPath: string): void {
        try {
            this.db = sqlite(dbPath, {
                fileMustExist: false,
                memory: dbPath === SqliteDatabase.MEMORY_DB,
                readonly: false
            });
        } catch (err) {
            this.logError(JSON.stringify(err));
        }
    }

    public close(): void {
        try {
            this.db.close();
        } catch (err) {
            this.logError(JSON.stringify(err));
        }
    }

    public async hasTable(tablename: string): Promise<boolean> {
        const statement = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tablename}'`;

        const result = await this.query(statement, {}).toPromise();
        return result && result.name === tablename;
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


    public bulk(statement: string, parameters: any[], logErrors = true): void {
        try {
            const sqlStatement = this.db.prepare(statement);

            const transaction = this.db.transaction(vals => {
                for (const val of vals) {
                    sqlStatement.run(val);
                }
            });

            transaction(parameters);
        } catch (err) {
            if (logErrors) {
                this.logError(`Unable to insert '${statement}' with params ${JSON.stringify(parameters)}`);
                this.logError(err.message);
            }
        }
    }

    public query(statement: string, parameters: any): Observable<any> {

        try {
            const results = this.db
                .prepare(statement)
                .all(parameters);
            // this.logDebug(`Fetched ${results.length} from DB`);
            return from(results);
        } catch (err) {
            this.logError(`Unable to get '${statement}' with params ${JSON.stringify(parameters)}`);
            this.logError(err.message);
        }

        const result$ = new Subject<any>();
        result$.complete();
        return result$.asObservable();
    }

    public insert(sql: string, parameters: any, logErrors = true): Observable<number> {
        try {
            const result: any = this.db
                .prepare(sql)
                .run(parameters);

            const insertedId = <number>result.lastInsertRowid;

            return of(insertedId);

        } catch (err) {
            if (logErrors) {
                this.logError(`Unable to insert '${sql}' with params ${JSON.stringify(parameters)}`);
                this.logError(err.message);
            }
        }

        const subject$ = new Subject<number>();
        subject$.complete();
        return subject$.asObservable();
    }


    public run(sql: string, parameters: any): void {

        try {
            this.db
                .prepare(sql)
                .run(parameters);

        } catch (err) {
            this.logError(`Unable to execute '${sql}' with params ${JSON.stringify(parameters)}`);
            this.logError(err.message);
        }
    }
}

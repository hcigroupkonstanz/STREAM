import { BETTER_SQLITE_WORKER } from './better-sqlite-database-worker';
import { WorkerServiceProxy } from '../core';
import { Observable } from 'rxjs';
import { filter, take, switchMap, map } from 'rxjs/operators';

export class SqliteDatabaseProxy extends WorkerServiceProxy {
    public static readonly MEMORY_DB = ':memory:';
    public serviceName = 'SQLiteProxy';
    public groupName = 'database';

    private idCounter = 0;
    private isOpen = false;

    public constructor() {
        super();
        this.initCluster(BETTER_SQLITE_WORKER);
    }

    public open(dbPath: string): void {
        if (!this.isOpen) {
            this.isOpen = true;
            this.postMessage('m:open', {
                dbPath: dbPath,
                isMemory: dbPath === SqliteDatabaseProxy.MEMORY_DB
            });
        } else {
            this.logError(`Unable to open DB on path ${dbPath}, already open!`);
        }
    }

    public close(): void {
        if (this.isOpen) {
            this.isOpen = false;
            this.postMessage('m:close');
        }
    }

    public async backupAndReset() {
        if (this.isOpen) {
            this.isOpen = false;
            await this.getResponse('m:backupAndReset', {});
            this.logDebug(`DB Reset complete`);
            this.isOpen = true;
        }
    }

    public async hasTable(tablename: string): Promise<boolean> {
        return this.getResponse('m:hasTable', { tablename: tablename }).toPromise();
    }

    public initTable(tablename: string, columns: string[]): void {
        this.postMessage('m:initTable', { tablename: tablename, columns: columns });
    }


    public bulk(statement: string, parameters: any[], logErrors = true): void {
        this.postMessage('m:bulk', {
            statement: statement,
            parameters: parameters,
            logErrors: logErrors
        });
    }

    public query(statement: string, parameters: any): Observable<any> {
        return this.getResponse('m:query', {
            statement: statement,
            parameters: parameters
        }).pipe(switchMap(result => result || []));
    }

    public insert(statement: string, parameters: any, logErrors = true): Observable<number> {
        return this.getResponse('m:insert', {
            statement: statement,
            parameters: parameters,
            logErrors: logErrors
        });
    }


    public run(statement: string, parameters: any) {
        return this.getResponse('m:run', {
            statement: statement,
            parameters: parameters
        });
    }


    private getResponse(channel: string, content: any): Observable<any> {
        const id = this.idCounter++;
        content.id = id;

        this.postMessage(channel, content);
        return this.workerMessages$.pipe(
            filter(msg => msg.channel === channel),
            filter(msg => msg.content.id === id),
            take(1),
            filter(msg => !msg.content.isError),
            map(msg => msg.content.response)
        );
    }
}

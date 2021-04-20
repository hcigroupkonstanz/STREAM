import * as sql from 'tedious';

import { ReplaySubject, Observable, Subject } from 'rxjs';
import { skipWhile, take, mapTo } from 'rxjs/operators';
import { Database } from './database';


enum ConnectionState {
    Offline, Connected, Busy
}

class Status {

    public subscription = new ReplaySubject<ConnectionState>();

    private connectionStatus = ConnectionState.Offline;

    public isConnected(): boolean {
        return this.connectionStatus === ConnectionState.Connected ||
            this.connectionStatus === ConnectionState.Busy;
    }

    public set(state: ConnectionState): void {
        this.connectionStatus = state;
        this.subscription.next(state);
    }

    public get(): ConnectionState {
        return this.connectionStatus;
    }

    public whenReady(): Observable<void> {
        return this.subscription.pipe(
            skipWhile(status => {
                // query member instead, in case it changes to busy
                if (this.connectionStatus === ConnectionState.Connected) {
                    // only allow *one* connection at a time
                    this.connectionStatus = ConnectionState.Busy;
                    return false;
                }

                return true; // skip
            }),
            take(1),
            mapTo(undefined)
        );
    }
}


export interface MssqlConfig {
    username: string;
    password: string;
    hostname: string;
    database: string;
    query: string;
}

export class MssqlDatabase extends Database {
    public get serviceName(): string { return `MSSQL-${this.config.database}`; }
    public get groupName(): string { return 'db'; }

    private readonly connectionStatus = new Status();
    private sqlConnection: sql.Connection;


    public constructor(private config: MssqlConfig) {
        super();
    }

    public init() {
        this.connect();
    }

    public connect(reconnectCount: number = 0): void {
        this.sqlConnection = new sql.Connection({
            server: this.config.hostname,
            authentication: {
                options: {
                    userName: this.config.username,
                    password: this.config.password,
                }
            },
            options: {
                encrypt: true,
                database: this.config.database
            }
        });

        this.sqlConnection.on('connect', err => {
            if (err) {
                this.logError(`Could not connect to ${this.config.database}:`);
                this.logError(JSON.stringify(err));
            } else {
                this.logInfo(`Connection to ${this.config.database} established`);
                this.connectionStatus.set(ConnectionState.Connected);
            }
        });

        this.sqlConnection.on('error', err => {
            this.connectionStatus.set(ConnectionState.Offline);
            this.logError(err.message);

            if (reconnectCount < 3) {
                this.logInfo(`Reconnection try #${reconnectCount + 1}`);
                this.connect(reconnectCount + 1);
            } else {
                this.logInfo(`Exceeded reconnect tries, waiting..`);
                setTimeout(() => {
                    this.logInfo(`Retrying to establish connection...`);
                    this.connect(0);
                }, 30 * 1000);
            }
        });
    }

    public disconnect(): void {
        if (this.connectionStatus.isConnected()) {
            this.sqlConnection.close();
            this.connectionStatus.set(ConnectionState.Offline);
            this.logInfo(`Terminating connection to ${this.config.database}`);
        }
    }

    public query(statement: string, parameters: any): Observable<any> {
        const resultSubject = new Subject<any>();

        this.connectionStatus.whenReady().subscribe(() => {
            const sqlRequest = new sql.Request(statement, (error, rowCount, rows) => {
                if (error) {
                    this.logError(`Error during SQL statement '${statement}'`);
                    this.logError(JSON.stringify(error.message));
                    resultSubject.error(error);
                }

                this.logDebug(`Fetched ${rowCount} rows for ${statement}`);
                resultSubject.complete();
                // unmark connection from being busy, so that next request can be started
                this.connectionStatus.set(ConnectionState.Connected);
            });

            for (const paramKey of Object.keys(parameters)) {
                const paramValue = parameters[paramKey];
                let type = sql.TYPES.VarChar;

                if (typeof paramValue === 'number') {
                    type = sql.TYPES.Float;
                }

                sqlRequest.addParameter(paramKey, type, paramValue);
            }

            sqlRequest.on('row', columns => {
                const result: any = {};
                for (let i = 0; i < columns.length; i++) {
                    const col = columns[i];
                    const colName = col.metadata.colName;
                    const colValue = col.value;
                    result[colName] = colValue;
                }

                resultSubject.next(result);
            });

            this.sqlConnection.execSql(sqlRequest);

        });

        return resultSubject.asObservable();
    }
}

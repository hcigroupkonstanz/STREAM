import { Observable, Subject, of } from 'rxjs';
import { map, finalize, shareReplay } from 'rxjs/operators';

import * as _ from 'lodash';

import { Service } from '../core';

import { SqliteDatabaseProxy } from './sqlite-database-proxy';
import { SqlSerializable } from './sql-serializable';

export interface ChangeEvent<T> {
    model: T;
    changes: string[];
    source: any;
}

export class Manager<T extends SqlSerializable> extends Service {
    public get serviceName(): string { return `DB:${this.tableName}`; }
    public get groupName(): string { return 'db'; }


    private columns: string[] = [];

    private hasLoadedAll = false;

    private _loadedEntries: T[] = [];
    public get loadedEntries(): T[] {
        return this._loadedEntries;
    }


    private _modelChanges = new Subject<ChangeEvent<T>>();
    public get modelChanges$(): Observable<ChangeEvent<T>> {
        return this._modelChanges.asObservable();
    }

    private _modelCreated = new Subject<T>();
    public get modelCreated$(): Observable<T> {
        return this._modelCreated.asObservable();
    }

    private _modelDeleted = new Subject<T>();
    public get modelDeleted$(): Observable<T> {
        return this._modelDeleted.asObservable();
    }



    public constructor(
        private db: SqliteDatabaseProxy,
        private type: new(columns: string[]) => T,
        private tableName: string,
        private tableArgs: string[]) {
        super();
    }


    public async reinitialize() {
        for (const entry of this._loadedEntries) {
            this._modelDeleted.next(entry);
            entry.delete();
        }

        this.hasLoadedAll = false;
        this._loadedEntries = [];
        await this.init();
    }

    public getDatabase(): SqliteDatabaseProxy {
        return this.db;
    }


    public async init() {
        this.db.initTable(this.tableName, this.tableArgs);

        for (const arg of this.tableArgs) {
            const column = arg.split(' ')[0];
            this.columns.push(column);
        }

        await this.loadAll().toPromise();
    }

    private loadAll(): Observable<void> {
        if (this.hasLoadedAll) {
            return of(undefined);
        }

        const query =  this.db.query(`SELECT * FROM ${this.tableName}`, {});
        query.subscribe(t => {
            if (this.findLoadedEntry(t) === undefined) {
                this.load(t);
            }
        });

        this.hasLoadedAll = true;
        return query;
    }


    public get(params: {[key: string]: any}, createIfNotExist: boolean = false): Observable<T> {
        const cachedEntry = this.findLoadedEntry(params);

        if (cachedEntry) {
            return of(cachedEntry);
        }


        let hasDbResult = false;
        const results$ = new Subject<T>();
        const where = _.keys(params).map(k => `${k} = @${k}`).join(' AND ');

        this.db.query(`SELECT * FROM ${this.tableName} WHERE ${where}`, params)
            .pipe(finalize(() => {
                if (!hasDbResult && createIfNotExist) {
                    this.createEntry(params, results$);
                } else {
                    results$.complete();
                }
            }))
            .subscribe(result => {
                hasDbResult = true;
                results$.next(this.load(result));
            });

        return results$.asObservable();
    }


    public create(params?: any): Observable<T> {
        const dbParams = _.keys(params)
            .filter(k => params[k] !== undefined)
            .filter(k => _.includes(this.columns, k));
        let valueNames = _.join(dbParams, ', ');
        let valueBindings = _.map(dbParams, key => `@${key}`).join(', ');

        if (!dbParams || dbParams.length === 0) {
            valueNames = 'id';
            valueBindings = 'NULL';
        }

        const result$ = this.db.insert(`INSERT INTO ${this.tableName} (${valueNames}) VALUES (${valueBindings})`, params || {})
            .pipe(
                map(id => {
                    const entry = params ? this.load(params) : this.load({ id: id });
                    entry.id = id;
                    this._modelCreated.next(entry);
                    return entry;
                }),
                shareReplay()
            );

        // workaround: force side-effects to activate if there are no subscribers
        result$.toPromise();

        return result$;
    }


    private createEntry(params: { [key: string]: any }, result$: Subject<T>): void {
        this.logDebug(`Creating new DB entry`);

        // check cache in case of race-condition
        const cachedEntry = this.findLoadedEntry(params);

        if (cachedEntry) {
            this.logWarning(`Could not create client: Already loaded!`);
            this.logWarning(JSON.stringify(params));
            result$.next(cachedEntry);
            result$.complete();
        } else {
            const entry = this.load(params);

            const valueNames = _.keys(params).join(', ');
            const valueBindings = _.keys(params).map(key => `@${key}`).join(', ');

            this.db.insert(`INSERT INTO ${this.tableName} (${valueNames}) VALUES (${valueBindings})`, params)
                .subscribe(id => {
                    this.logInfo(`Created new entry with ID ${id}`);
                    entry.id = id;
                    result$.next(entry);
                    result$.complete();
                    this._modelCreated.next(entry);
                });
        }
    }


    private load(params: any): T {
        const entry = new this.type(this.columns);
        entry.fromDbEntry(params);

        if (params.id !== undefined) {
            const cachedEntry = this.findLoadedEntry({ id: params.id });
            if (cachedEntry) {
                this.logWarning('Tried to load already existing entry');
                return cachedEntry;
            }
        }

        entry.dbChanges$
            .subscribe(() => this.update(entry));

        entry.modelChanges$
            .subscribe(ev => this._modelChanges.next({
                model: entry,
                changes: ev.changes,
                source: ev.source
            }));

        this._loadedEntries.push(entry);
        return entry;
    }


    public findLoadedEntry(params: any): T | undefined {
        const cachedEntry = _.find(this._loadedEntries, e => {
            let isMatch = true;
            for (const key of Object.keys(params)) {
                // tslint:disable-next-line:triple-equals
                isMatch = isMatch && params[key] == e[key];
            }
            return isMatch;
        });

        return cachedEntry;
    }

    private update(entry: T): void {
        if (this._loadedEntries.indexOf(entry) < 0) {
            this.logError(`Cannot update entry ${entry.id}: Already deleted`);
        } else {
            const dbEntry = entry.toDbEntry();
            const updates = _.keys(dbEntry).filter(k => k !== 'id').map(k => `${k} = @${k}`).join(', ');

            this.db.run(`UPDATE ${this.tableName} SET ${updates} WHERE id = @id`, dbEntry);
            this.logDebug(`Updating entry ${entry.id} in DB`);
        }
    }


    public delete(id: number): void {
        const loadedEntries = _.remove(this._loadedEntries, e => e.id === id);

        for (const entry of loadedEntries) {
            this._modelDeleted.next(entry);
            entry.delete();
        }

        this.db.run(`DELETE FROM ${this.tableName} WHERE id = @id`, { id: id });
    }
}

import * as _ from 'lodash';
import { ErrorHandler } from '../core';
import { sample, mapTo, share, filter, auditTime } from 'rxjs/operators';
import { Serializable } from '../core';
import { Observable, Subject } from 'rxjs';

export abstract class SqlSerializable extends Serializable {
    public static readonly TableName: string;
    public static readonly TableArgs: string[];

    public readonly dbChanges$: Observable<void>;

    protected readonly dbInitialization = new Subject<void>();

    public constructor(private dbColumns: string[]) {
        super();

        this.dbChanges$ = this.modelChanges.pipe(filter(change => dbColumns.indexOf(change) >= 0), sample(this.modelChanges.pipe(auditTime(2000))), mapTo(null), share());
    }

    public fromDbEntry(params: any) {
        for (const key of Object.keys(params)) {
            if (key === 'id') {
                this.id = params[key];
            } else if (params[key] !== null && params[key] !== undefined) {
                const k = `_${key}`;
                if (params[key][0] === '[' || params[key][0] === '{') {
                    try {
                        this[k] = JSON.parse(params[key]);
                    } catch (e) {
                        ErrorHandler.logError(e.message);
                    }
                } else if (typeof this[k] === 'boolean') {
                    this[k] = !!params[key];
                } else {
                    this[k] = params[key];
                }
            }
        }

        this.dbInitialization.complete();
    }


    public toDbEntry(): { [key: string]: string | number } {
        const entry = {};

        for (const col of this.dbColumns) {
            const val = this[col];

            if (val instanceof Array || val instanceof Object) {
                entry[col] = JSON.stringify(val);
            } else if (typeof val === 'boolean') {
                entry[col] = val ? 1 : 0;
            } else {
                entry[col] = val;
            }
        }

        return entry;
    }
}

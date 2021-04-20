import * as _ from 'lodash';
import { Subject, Observable, merge } from 'rxjs';
import { share, sample, auditTime, buffer } from 'rxjs/operators';

export abstract class ObservableModel {
    protected readonly modelChanges: Subject<string> = new Subject();
    public readonly localModelChanges$ = this.modelChanges.pipe(buffer(this.modelChanges.pipe(auditTime(50))), share());


    protected readonly remoteModelChanges: Subject<string[]> = new Subject();
    public readonly remoteModelChanges$: Observable<string[]> = this.remoteModelChanges.pipe(
        sample(this.remoteModelChanges.pipe(auditTime(1))),
        share());


    public readonly modelChanges$: Observable<string[]> = merge(this.localModelChanges$, this.remoteModelChanges$);

    private _id = -100;
    public get id(): number {
        return this._id;
    }


    public constructor() {
        // cannot call remoteUpdate here, as member initialization would override values
    }

    public remoteUpdate(updates: any): void {
        const keys = Object.keys(updates);
        for (const key of keys) {
            this[`_${key}`] = updates[key];
        }
        this.remoteModelChanges.next(keys);
    }


    public toJson(attributes: string[] = []): {[key: string]: any} {
        const json = { id: this.id };

        if (attributes.length === 0) {
            attributes = _
                .keys(this)
                .filter(k => k[0] === '_')
                .map(k => _.camelCase(k));
        }

        for (const attribute of attributes) {
            json[attribute] = this[`_${attribute}`];
        }

        return json;
    }


    public destroy(): void {
        this.modelChanges.complete();
        this.remoteModelChanges.complete();
    }
}

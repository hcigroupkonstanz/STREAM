import { BehaviorSubject, Subject } from 'rxjs';
import { first, mapTo, auditTime, share } from 'rxjs/operators';

export abstract class RemoteService {
    protected readonly _initialized = new BehaviorSubject<boolean>(false);
    public get initialized(): Promise<void> {
        return this._initialized.pipe(first(x => x), mapTo(null)).toPromise();
    }

    protected readonly anyUpdateStream = new Subject<void>();
    public readonly anyUpdates$ = this.anyUpdateStream.pipe(
        auditTime(1),
        share()
    );
}

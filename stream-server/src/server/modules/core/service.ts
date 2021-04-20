import { Observable, Subject, BehaviorSubject, merge } from 'rxjs';
import { LogMessage, LogLevel } from './log-message';
import { switchMap, share } from 'rxjs/operators';

export abstract class Service {
    public static readonly Current$: BehaviorSubject<Service[]> = new BehaviorSubject([]);
    public static readonly Outputs$ = Service.Current$.pipe(
        switchMap(services => {
            const outputs = services.map(s => s.output$);
            return merge(...outputs);
        }),
        share()
    );

    protected outputStream$: Subject<LogMessage> = new Subject<LogMessage>();

    protected logDebug(msg: string): void {
        this.outputMsg(LogLevel.Debug, msg);
    }

    protected logInfo(msg: string): void {
        this.outputMsg(LogLevel.Info, msg);
    }

    protected logWarning(msg: string): void {
        this.outputMsg(LogLevel.Warn, msg);
    }

    protected logError(msg: string, printStacktrace: boolean = true): void {
        if (printStacktrace) {
            msg += '\n' + new Error().stack;
        }
        this.outputMsg(LogLevel.Error, msg);
    }

    public get output$(): Observable<LogMessage> {
        return this.outputStream$.asObservable();
    }

    public abstract get serviceName(): string;
    public abstract get groupName(): string;

    public constructor() {
        Service.Current$.next(Service.Current$.value.concat(this));
    }

    public init() { }

    private outputMsg(lvl: LogLevel, msg: string): void {
        this.outputStream$.next({
            origin: this.serviceName,
            group: this.groupName,
            level: lvl,
            message: msg,
            created: new Date()
        });
    }
}

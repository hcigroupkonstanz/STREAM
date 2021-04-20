import { Service } from './service';

export class RedirectConsole extends Service {
    public serviceName = 'NodeJS';
    public groupName = 'core';

    private isInit = false;

    public constructor() {
        super();

        const oldDebug = console.debug;
        console.debug = (msg) => {
            if (this.isInit) {
                this.logDebug(msg);
            }
            oldDebug(msg);
        };

        const oldLog = console.log;
        console.log = (msg) => {
            if (this.isInit) {
                this.logInfo(msg);
            }
            oldLog(msg);
        };

        const oldWarn = console.warn;
        console.warn = (msg) => {
            if (this.isInit) {
                this.logWarning(msg);
            }
            oldWarn(msg);
        };

        const oldError = console.error;
        console.error = (msg) => {
            if (this.isInit) {
                this.logError(msg);
            }
            oldError(msg);
        };
    }

    public init() {
        super.init();
        this.isInit = true;
    }
}

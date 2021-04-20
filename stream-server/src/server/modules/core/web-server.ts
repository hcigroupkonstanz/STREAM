import * as http from 'http';
import * as path from 'path';
import * as express from 'express';
import * as bodyparser from 'body-parser';
import * as cors from 'cors';

import { Service } from './service';

export class WebServer extends Service {

    public get serviceName(): string { return 'WebServer'; }
    public get groupName(): string { return 'web'; }

    private app: express.Application;
    private server: http.Server;
    private isRunning = false;

    public constructor(private webPort: number, private webRoot: string) {
        super();

        this.app = express();
        this.app.set('port', this.webPort);

        // handle POST data
        this.app.use(bodyparser.urlencoded({ extended: false }));
        this.app.use(bodyparser.json());

        // enable CORS
        this.app.use(cors());

        // set up default routes
        this.app.use(express.static(path.join(this.webRoot)));
    }

    public start(): http.Server {
        // add default route for 404s last
        this.app.use((req, res, next) => {
            res.sendFile(path.join(this.webRoot, 'index.html'));
            this.logWarning(`Unmatched route: ${req.path}`);
        });

        // lock server so no more route changes are allowed
        this.isRunning = true;

        // start server
        this.server = http.createServer(this.app);
        this.server.listen(this.webPort, () => {
            this.logInfo(`Web server listening on 0.0.0.0:${this.webPort}`);
        });

        return this.server;
    }

    public stop(): void {
        if (this.isRunning) {
            this.server.close();
            this.isRunning = false;
        }
    }

    public addRoute(url: string, requestHandler: express.RequestHandler | express.Router): void {
        if (this.isRunning) {
            this.logError(`Could not add route ${url}: Server already running`);
        } else {
            this.app.use(url, requestHandler);
        }
    }

    public addApi(url: string, requestHandler: express.RequestHandler | express.Router): void {
        this.addRoute(path.join('/api/', url).replace(/\\/g, '/'), requestHandler);
    }

}

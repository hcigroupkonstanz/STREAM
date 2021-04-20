import { BehaviorSubject } from 'rxjs';
import * as lodash from 'lodash';
import * as stream from './modules';
import { Config } from './configuration';

// Better TypeScript error messages
require('source-map-support').install();

/**
 * Debugging
 */

// Unlimited stacktrace depth (due to RxJS)
Error.stackTraceLimit = Infinity;

// Print console errors in GUI
const redirectConsole = new stream.RedirectConsole();


/**
 *    Database
 */


const localDb = new stream.SqliteDatabaseProxy();
localDb.open(Config.PERSISTENTDB_PATH);

const sessionDb = new stream.SqliteDatabaseProxy();
sessionDb.open(Config.SESSIONDB_PATH);

const replayDb = new stream.SqliteDatabaseProxy();
replayDb.open(Config.REPLAYDB_PATH);
// replayDb.open(stream.SqliteDatabaseProxy.MEMORY_DB);

const memDb = new stream.SqliteDatabaseProxy();
memDb.open(stream.SqliteDatabaseProxy.MEMORY_DB);
// memDb.open(`test-${new Date().getTime()}.db`);

// const dbLogOutput = new stream.LoadLogFromDb(sessionDb);
const dbLogInput = new stream.WriteLogToDb(replayDb);

const dataProvider$: BehaviorSubject<stream.DataProvider> = new BehaviorSubject(null);



/**
 *    Managers
 */

const webClientManager = new stream.Manager<stream.WebClient>(localDb, stream.WebClient, stream.WebClient.TableName, stream.WebClient.TableArgs);
const unityClientManager = new stream.Manager<stream.UnityClient>(localDb, stream.UnityClient, stream.UnityClient.TableName, stream.UnityClient.TableArgs);
const trackerManager = new stream.Manager<stream.Tracker>(localDb, stream.Tracker, stream.Tracker.TableName, stream.Tracker.TableArgs);

const originPointManager = new stream.Manager<stream.OriginPoint>(localDb, stream.OriginPoint, stream.OriginPoint.TableName, stream.OriginPoint.TableArgs);
const plotManager = new stream.Manager<stream.Plot>(sessionDb, stream.Plot, stream.Plot.TableName, stream.Plot.TableArgs);
const linkManager = new stream.Manager<stream.Link>(sessionDb, stream.Link, stream.Link.TableName, stream.Link.TableArgs);
const filterManager = new stream.Manager<stream.Filter>(sessionDb, stream.Filter, stream.Filter.TableName, stream.Filter.TableArgs);


/**
 *    Servers
 */
const webServer = new stream.WebServer(Config.WEBSERVER_PORT, Config.WEBSERVER_ROOT);
const webSocketServer = new stream.SocketIOServer(webClientManager);
const unityServer = new stream.UnityServerProxy(unityClientManager);


const writeIncNetworkingToDb = new stream.WriteIncomingNetworkingToDb(replayDb, unityServer, webSocketServer);
const writeOutNetworkingToDb = new stream.WriteOutgoingNetworkingToDb(replayDb, unityServer, webSocketServer);

/**
 *    APIs
 */
const webClientListener = new stream.WebClientListener(webSocketServer, unityServer, webClientManager);
const webClientLogger = new stream.WebClientLogger(webSocketServer);

const unityClientListener = new stream.UnityClientListener(unityServer, unityClientManager);
const unityClientLogger = new stream.UnityClientLogger(unityServer);

const originPointListener = new stream.OriginPointListener(originPointManager, unityServer);

const viveTrackerListener = new stream.TrackerListener(unityServer, webSocketServer, trackerManager);

const dataProviderRestApi = new stream.DataProviderRestApi(webServer, dataProvider$);

const plotListener = new stream.PlotListener(plotManager, webSocketServer, unityServer);
const linkListener = new stream.LinkListener(linkManager, plotManager, webSocketServer, unityServer);
const dataProcessor = new stream.DataProcessor(dataProvider$, memDb, plotManager, linkManager, filterManager);
const filterListener = new stream.FilterListener(filterManager, plotManager, webSocketServer, unityServer);
const colorListener = new stream.ColorListener(plotManager, linkManager, filterManager, dataProvider$, unityServer, webSocketServer);

/**
 *    Plumbing
 */

const poseDistributor = new stream.PoseDistributor(trackerManager,
    unityClientManager, unityServer, webClientManager, webSocketServer, originPointManager);

const webClientDistributor = new stream.WebClientDistributor(webClientManager, webSocketServer, unityServer);
const ownerDistributor = new stream.OwnerDistributor(webClientManager, unityClientManager, webSocketServer, unityServer);
const voiceListener = new stream.VoiceListener(webSocketServer, unityServer, webClientManager);
const instantMessages = new stream.InstantMessages(unityServer, webSocketServer);


/**
 *   Study
 */

const study = new stream.StudyController('data/', sessionDb, dataProvider$, [ sessionDb, memDb ], [ filterManager, linkManager, plotManager ]);
const dataProviderChanger = new stream.DataProviderChangeNotification(dataProvider$, unityServer, webSocketServer);
const webClientInteractionLogger = new stream.WebClientInteractionLogger(webSocketServer, replayDb);

/**
 *    GUI
 */

// for easier referral for console input
const webclients = webClientManager.loadedEntries;
const unityclients = unityClientManager.loadedEntries;
const trackers = trackerManager.loadedEntries;
const plots = plotManager.loadedEntries;
const links = linkManager.loadedEntries;
const filters = filterManager.loadedEntries;
const origin = originPointManager.loadedEntries;
const colorTables = colorListener.colorTables;
const _ = lodash;

const adminServer = new stream.WebServer(Config.ADMIN_SERVER_PORT, Config.ADMIN_SERVER_ROOT);
// tslint:disable-next-line:no-eval
const adminSocketServer = new stream.AdminSocketIoServer((input) => eval(input));

const webClientCommands = new stream.WebClientCommands(adminSocketServer, webClientManager, webSocketServer);
const unityClientCommands = new stream.UnityClientCommands(adminSocketServer, unityClientManager, unityServer);
const trackerCommands = new stream.TrackerCommands(adminSocketServer, trackerManager, originPointManager, unityServer);
const plotCommands = new stream.PlotCommands(adminSocketServer, plotManager, linkManager);
const msgCounter = new stream.MsgCounter(adminSocketServer, unityServer, webSocketServer);

const clientInfo = new stream.ClientInfo(adminSocketServer, unityServer, unityClientManager, webSocketServer, webClientManager, trackerManager, plotManager, linkManager);


/**
 *    Startup
 */

setImmediate(async () => {
    const guiLogOutput = new stream.LogOutput(adminSocketServer);
    adminSocketServer.start(adminServer.start());

    for (const service of stream.Service.Current$.value) {
        await service.init();
    }

    const httpServer = webServer.start();
    webSocketServer.start(httpServer);
    unityServer.start(Config.UNITY_PORT_AR, Config.UNITY_PORT_TRACKING);
});

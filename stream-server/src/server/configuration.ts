export const Config = {
    WEBSERVER_PORT: 8080,
    WEBSERVER_ROOT: __dirname + '/../stream-tablet/',

    ADMIN_SERVER_PORT: 8090,
    ADMIN_SERVER_ROOT: __dirname + '/../ui/',

    SESSIONDB_PATH: __dirname + '/../session.db',
    REPLAYDB_PATH: __dirname + `/../replay-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.db`,
    PERSISTENTDB_PATH: __dirname + '/../persistent.db',

    UNITY_PORT_AR: 8835,
    UNITY_PORT_TRACKING: 8836
};

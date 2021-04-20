import { SocketIOServer } from '../web-clients';
import { Service, NC_DATA, Message } from '../core';
import { Observable } from 'rxjs';
import { DataProvider } from '../data-provider';
import { UnityServerProxy } from '../unity';
import * as _ from 'lodash';

export class DataProviderChangeNotification extends Service {
    public serviceName = 'DataChange';
    public groupName = 'stream';

    public constructor(dataProvider$: Observable<DataProvider>, unityServer: UnityServerProxy, socketServer: SocketIOServer) {
        super();

        dataProvider$.subscribe(provider => {
            const msg: Message = {
                channel: NC_DATA,
                command: 'data-reload',
                payload: provider ? _.map(provider.dimensions, d => d.toJson()) : []
            };

            unityServer.broadcast(msg);
            socketServer.broadcast(msg);
        });
    }
}

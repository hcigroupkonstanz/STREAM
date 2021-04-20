import { Routes } from '@angular/router';
import * as stream from '@stream/components';

export const routes: Routes = [
    {
        path: 'live',
        component: stream.LiveComponent,
        children: [
            { path: 'menu', component: stream.LiveMenuComponent },
            { path: 'settings', component: stream.SettingsComponent },
            { path: 'zen', component: stream.ZenModeComponent },

            { path: 'plot/:id/placement', component: stream.PlotPlacementComponent },
            { path: 'plot/:id/vis', component: stream.ScatterPlotComponent },

            { path: 'link/:id/vis', component: stream.LinkViewComponent },

            { path: '**', redirectTo: 'menu', pathMatch: 'full' },
        ]
    },

    {
        path: 'start',
        component: stream.StartMenuComponent
    },
    {
        path: 'settings',
        component: stream.SettingsComponent
    },
    {
        path: 'debug',
        component: stream.PlotListComponent,
    },
    {
        path: 'debug/:id',
        component: stream.PlotDebugViewComponent,
    },
    {
        path: '**',
        redirectTo: '/start',
        pathMatch: 'full'
    }
];

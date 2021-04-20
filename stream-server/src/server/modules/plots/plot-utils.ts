import * as _ from 'lodash';
import { Manager } from '../database';
import { Plot } from './plot';
import { Link } from './link';

export class PlotUtils {

    public static getConnectedPlots(plots: Manager<Plot>, links: Manager<Link>, startPlotId: number): Plot[] {
        const startPlot = plots.findLoadedEntry({ id: startPlotId });
        if (!startPlot) {
            return [];
        }

        const connectedPlots: Plot[] = [startPlot];

        for (let i = 0; i < connectedPlots.length; i++) {
            const currentPlot = connectedPlots[i];
            const upstreamLinks = _.filter(links.loadedEntries, l => l.upstream === currentPlot.id || l.downstream === currentPlot.id);

            for (const link of upstreamLinks) {
                const upstreamPlot = plots.findLoadedEntry({ id: link.upstream });
                if (upstreamPlot && connectedPlots.indexOf(upstreamPlot) < 0) {
                    connectedPlots.push(upstreamPlot);
                }

                const downstreamPlot = plots.findLoadedEntry({ id: link.downstream });
                if (downstreamPlot && connectedPlots.indexOf(downstreamPlot) < 0) {
                    connectedPlots.push(downstreamPlot);
                }
            }
        }

        return connectedPlots;
    }

}

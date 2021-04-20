using Assets.Modules.Networking;

namespace Assets.Modules.Plots
{
    public class PlotManager : Manager<Plot>
    {
        protected override int Channel => NetworkChannel.PLOT;
    }
}

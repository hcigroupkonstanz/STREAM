using Assets.Modules.Networking;
using UniRx;

namespace Assets.Modules.Plots
{
    public class ColorTableLookup : Manager<ColorTable>
    {
        protected override int Channel => NetworkChannel.COLOR;

        protected async override void OnEnable()
        {
            await PlotManager.Instance.Initialized;
            base.OnEnable();
        }
    }
}

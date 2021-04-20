using Assets.Modules.Networking;
using Assets.Modules.Plots;
using System.Linq;
using UnityEngine;
using UniRx;

namespace Assets.Modules.Filters
{
    public class FilterManager : Manager<Filter>
    {
        protected override int Channel => NetworkChannel.FILTER;

        private PlotManager _plots;

        protected override async void OnEnable()
        {
            _plots = PlotManager.Instance as PlotManager;
            await _plots.Initialized;

            Filter.AllRemoteChanges()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Origin"))
                .Subscribe(async ev =>
                {
                    await _plots.Initialized;
                    var plot = _plots.Get(ev.Model.Origin);
                    if (plot)
                    {
                        ev.Model.transform.SetParent(plot.Visualization, false);
                        // scatter plot's position is in the middle, set position to 'origin' of scatter plot
                        ev.Model.transform.localPosition = new Vector3(-0.5f, -0.5f, 0);
                    }
                    else
                        Debug.LogError($"Unable to find plot {ev.Model.Origin} for filter {ev.Model.Id}");
                });

            base.OnEnable();
        }
    }
}

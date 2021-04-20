using UniRx;
using UnityEngine;

namespace Assets.Modules.Plots
{
    public class PlotFilterIndicator : MonoBehaviour
    {
        public GameObject ImgEnabled;
        public GameObject ImgDisabled;

        private void Awake()
        {
            var plot = GetComponentInParent<Plot>();
            plot.UseFilterRx
                .TakeUntilDestroy(this)
                .ObserveOnMainThread()
                .Subscribe(val =>
                {
                    ImgEnabled.SetActive(val);
                    ImgDisabled.SetActive(!val);
                });
        }
    }
}

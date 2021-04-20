using UniRx;
using UnityEngine;

namespace Assets.Modules.Plots
{
    public class PlotSortIndicator : MonoBehaviour
    {
        public GameObject ImgEnabled;
        public GameObject ImgDisabled;

        private void Awake()
        {
            var plot = GetComponentInParent<Plot>();
            plot.UseSortRx
                .ObserveOnMainThread()
                .TakeUntilDestroy(this)
                .Subscribe(val =>
                {
                    ImgEnabled.SetActive(val);
                    ImgDisabled.SetActive(!val);
                });
        }

    }
}

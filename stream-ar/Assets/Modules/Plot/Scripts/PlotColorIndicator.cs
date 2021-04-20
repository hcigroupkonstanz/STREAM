using UniRx;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Modules.Plots
{
    public class PlotColorIndicator : MonoBehaviour
    {
        public GameObject ImgEnabled;
        public GameObject ImgDisabled;

        private void Awake()
        {
            var plot = GetComponentInParent<Plot>();
            plot.UseColorRx
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

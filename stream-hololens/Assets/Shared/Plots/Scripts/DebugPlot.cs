using System;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Plots
{
    [RequireComponent(typeof(Plot))]
    public class DebugPlot : MonoBehaviour
    {
        public int ChangeInterval = 10;
        private Plot _plot;

        private void OnEnable()
        {
            _plot = GetComponent<Plot>();
            Observable.Interval(TimeSpan.FromSeconds(ChangeInterval))
                .Subscribe(_ => GenerateRandomValues());
            GenerateRandomValues();
        }

        private void GenerateRandomValues()
        {
            DataDimensionManager.Instance
                .GetDimensions()
                .Subscribe(dims =>
                {
                    _plot.DimX = dims.ElementAt((int)Math.Floor(UnityEngine.Random.value * dims.Count())).Column;
                    _plot.DimY = dims.ElementAt((int)Math.Floor(UnityEngine.Random.value * dims.Count())).Column;
                });
        }
    }
}

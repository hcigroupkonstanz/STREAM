using Assets.Modules.Plots;
using UniRx;
using UnityEngine;

namespace Assets.Modules.ScatterPlots
{
    [RequireComponent(typeof(Renderer))]
    public class SetPlotColor : MonoBehaviour
    {
        public bool UseStaticColor;
        public Color StaticColor;

        private Renderer _renderer;
        private MaterialPropertyBlock _propBlock;

        private void Awake()
        {
            _propBlock = new MaterialPropertyBlock();
            _renderer = GetComponent<Renderer>();
        }

        private void OnEnable()
        {
            var plot = GetComponentInParent<Plot>();
            if (plot)
            {
                plot.ColorRx
                    .TakeUntilDisable(this)
                    .Subscribe(_ => UpdateColor(plot.Color));
            }
            else if (UseStaticColor)
            {
                UpdateColor(StaticColor);
            }
            else
            {
                Debug.LogError("Unable to find plot, disabling...");
                enabled = false;
            }
        }

        private void UpdateColor(Color color)
        {
            _renderer.GetPropertyBlock(_propBlock);
            _propBlock.SetColor("_color", color);
            _renderer.SetPropertyBlock(_propBlock);
        }
    }
}

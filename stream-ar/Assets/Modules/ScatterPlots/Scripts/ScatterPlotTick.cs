using Assets.Modules.Plots;
using TMPro;
using UnityEngine;

namespace Assets.Modules.ScatterPlots
{
    public class ScatterPlotTick : MonoBehaviour
    {
        public TextMeshPro Label;
        public TextMeshPro LabelBack;
        public TextMeshPro InvertedLabel;
        public TextMeshPro InvertedLabelBack;

        public GameObject LabelContainer;
        public GameObject InvertedContainer;

        private bool _isInverted;
        public bool IsInverted
        {
            get => _isInverted;
            set
            {
                _isInverted = value;
                LabelContainer.SetActive(!_isInverted);
                InvertedContainer.SetActive(_isInverted);
            }
        }

        public GameObject Line;
        public bool IsEdge { get; set; }

        public void SetTick(DataDimension.Tick tick)
        {
            Label.text = tick.Name;
            LabelBack.text = tick.Name;
            InvertedLabel.text = tick.Name;
            InvertedLabelBack.text = tick.Name;

            Line.SetActive(!IsEdge);
        }
    }
}

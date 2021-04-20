using System;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Plots
{
    [RequireComponent(typeof(Collider))]
    public class PlotAlignmentCollider : MonoBehaviour
    {
        public enum AlignmentType { Horizontal, Vertical, Side }
        public AlignmentType Type;

        private readonly List<Plot> _collidedObjects = new List<Plot>();
        private Plot _plot;
        private PlotPosition _plotPosition;

        private void Awake()
        {
            _plot = GetComponentInParent<Plot>();
            _plotPosition = GetComponentInParent<PlotPosition>();

            // Workaround for removing plots, as OnTriggerExit isn't called
            Plot.ModelDestroyed()
                .TakeUntilDestroy(this)
                .Subscribe(p =>
                {
                    RemoveAlignment(p);
                    _collidedObjects.Remove(p);
                    _plotPosition.AvailableAlignments.RemoveAll(t => t.Item2 == p);
                });
        }

        private void OnTriggerEnter(Collider other)
        {
            var otherPlot = other.GetComponentInParent<Plot>();
            if (otherPlot && otherPlot != _plot)
            {
                AddAlignment(otherPlot);
                _collidedObjects.Add(otherPlot);
            }
        }

        private void OnTriggerExit(Collider other)
        {
            var otherPlot = other.GetComponentInParent<Plot>();
            if (otherPlot && otherPlot != _plot)
            {
                RemoveAlignment(otherPlot);
                _collidedObjects.Remove(otherPlot);
            }
        }

        private void AddAlignment(Plot other)
        {
            var otherPlotPos = other.GetComponent<PlotPosition>();
            otherPlotPos.AvailableAlignments.Add(Tuple.Create(Type, _plot));
        }

        private void RemoveAlignment(Plot other)
        {
            var otherPlotPos = other.GetComponent<PlotPosition>();
            otherPlotPos.AvailableAlignments.RemoveAll(t => t.Item1 == Type && t.Item2 == _plot);
        }
    }
}

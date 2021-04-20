using Assets.Modules.Networking;
using Assets.Modules.Plots;
using Assets.Modules.ScatterPlots;
using System;
using System.Collections.Generic;
using UniRx;
using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    [RequireComponent(typeof(LinkRenderer))]
    public class GraphLink : MonoBehaviour
    {
        public LinkPlacementHelper PositionHelperTemplate;
        public LinkPlacementHelper PositionHelper { get; set; }

        private Link _link;
        private LinkRenderer _renderer;
        private PlotManager _plotManager;
        private ArtsClient _client;

        private ScatterPlot _spSource;
        private Plot _sourcePlot;

        private ScatterPlot _spTarget;
        private Plot _targetPlot;


        private async void OnEnable()
        {
            _client = ArtsClient.Instance;
            _link = GetComponentInParent<Link>();
            _renderer = GetComponent<LinkRenderer>();

            _plotManager = PlotManager.Instance as PlotManager;
            await _plotManager.Initialized;

            if (!_link)
                return;

            Observable.Merge(_link.UpstreamRx, _link.DownstreamRx)
                .TakeUntilDisable(this)
                .BatchFrame()
                .ObserveOnMainThread()
                .Subscribe(_ => UpdatePlots());

            // display preview while link placement is active
            Observable.Merge(_client.LookingAtIdRx.Select(_ => 0), _client.LookingAtTypeRx.Select(_ => 0))
                .TakeUntilDisable(this)
                .Where(_ => _link.CreatedBy == _client.Id)
                .ObserveOnMainThread()
                .Subscribe(_ => UpdatePlots());

            Observable.Merge(
                this.ObserveEveryValueChanged(x => _spSource?.ColorTexture),
                this.ObserveEveryValueChanged(x => _spSource?.PositionTexture),
                this.ObserveEveryValueChanged(x => _spTarget?.PositionTexture))
                .TakeUntilDisable(this)
                .BatchFrame(0, FrameCountType.Update)
                .ObserveOnMainThread()
                .Subscribe(_ =>
                {
                    UpdatePlots();
                    UpdateRenderer();
                });


            // fade in newly created links
            _link.CreatedByRx
                .TakeUntilDisable(this)
                .Where(val => val > 0)
                .ObserveOnMainThread()
                .Subscribe(x =>
                {
                    _renderer.Transparency = 0;
                    var startTime = Time.time;
                    Observable.EveryUpdate()
                        .TakeUntilDisable(this)
                        .TakeWhile(_ => _renderer.Transparency < 0.9)
                        .Subscribe(_ => _renderer.Transparency = Mathf.Lerp(0, 1, (Time.time - startTime) * 2f), _ => { }, () => { _renderer.Transparency = 1f; });
                });


            await Observable.EveryEndOfFrame().Take(1);

            UpdatePlots();
        }

        private void UpdatePlots()
        {
            _sourcePlot = _plotManager.Get(_link.Upstream);
            _targetPlot = _plotManager.Get(_link.Downstream);

            if (_sourcePlot == null && _targetPlot == null)
            {
                Debug.LogError($"Unable to find both source ({_link.Upstream}) and target ({_link.Downstream}) plot!");
                name = $"GraphLink (Error)";
            }
            else if (_sourcePlot == null)
            {
                if (!PositionHelper)
                    PositionHelper = Instantiate(PositionHelperTemplate, transform);

                _renderer.StartAnchor = PositionHelper.transform;
                _renderer.EndAnchor = _targetPlot.Visualization;

                name = $"GraphLink to {_targetPlot.Id}";
            }
            else if (_targetPlot == null)
            {
                if (!PositionHelper)
                    PositionHelper = Instantiate(PositionHelperTemplate, transform);

                _renderer.EndAnchor = PositionHelper.transform;
                _renderer.StartAnchor = _sourcePlot.Visualization;

                name = $"GraphLink from {_sourcePlot.Id}";
            }
            else
            {
                if (PositionHelper)
                {
                    Destroy(PositionHelper.gameObject);
                    PositionHelper = null;
                }

                _renderer.StartAnchor = _sourcePlot.Visualization;
                _renderer.EndAnchor = _targetPlot.Visualization;

                Observable.Merge(_sourcePlot.DataRx, _targetPlot.DataRx)
                    .ObserveOnMainThread()
                    .TakeUntilDisable(this)
                    .BatchFrame(0, FrameCountType.EndOfFrame)
                    .Subscribe(_ => UpdateRenderer());

                name = $"GraphLink {_sourcePlot.Id} -> {_targetPlot.Id}";
            }


            _spSource = _sourcePlot?.GetComponentInChildren<ScatterPlot>();
            _spTarget = _targetPlot?.GetComponentInChildren<ScatterPlot>();

            if (_client.LookingAtType == "plot")
            {
                var tmpPlot = _plotManager.Get(_client.LookingAtId);
                if (_spSource == null)
                {
                    _spSource = tmpPlot?.GetComponentInChildren<ScatterPlot>();
                    _sourcePlot = tmpPlot;
                }
                else if (_spTarget == null)
                {
                    _spTarget = tmpPlot?.GetComponentInChildren<ScatterPlot>();
                    _targetPlot = tmpPlot;
                }
            }
        }

        private void UpdateRenderer()
        {
            if (_spSource == null && _spTarget == null)
            {
                // Ignore ...
            }
            else if (_spSource == null)
                GenerateTextures(_spTarget, _spTarget, _targetPlot, _targetPlot);
            else if (_spTarget == null)
                GenerateTextures(_spSource, _spSource, _sourcePlot, _sourcePlot);
            else
                GenerateTextures(_spSource, _spTarget, _sourcePlot, _targetPlot);
        }

        private void GenerateTextures(ScatterPlot spSource, ScatterPlot spTarget, Plot plotSource, Plot plotTarget)
        {
            // Create index texture to assign related data points between both textures
            var indexMapping = new List<Tuple<int, int>>();
            var j = 0;

            if (plotTarget.Data.Length > 0)
            {
                for (var i = 0; i < plotSource.Data.Length; i++)
                {
                    if (plotSource.Data[i].IsFiltered)
                        continue;

                    var sourceId = plotSource.Data[i].Id;

                    while ((j + 1) < plotTarget.Data.Length && plotTarget.Data[j].Id < sourceId)
                        j++;

                    var targetId = plotTarget.Data[j].Id;
                    if (sourceId == targetId)
                    {
                        indexMapping.Add(Tuple.Create(i, j));
                    }
                }
            }


            Texture2D indexTexture;
            var count = indexMapping.Count;

            if (count == 0 || spSource.PositionTexture == null || spTarget.PositionTexture == null || spSource.ColorTexture == null)
            {
                indexTexture = new Texture2D(1, 1, TextureFormat.RGBAFloat, false, true);
                indexTexture.SetPixel(0, 0, new Color(0, 0, 0, 0));
                indexTexture.Apply();
            }
            else
            {
                indexTexture = new Texture2D(count, 1, TextureFormat.RGBAFloat, false, true);
                indexTexture.filterMode = FilterMode.Point;
                indexTexture.wrapMode = TextureWrapMode.Clamp;

                Color[] pos = new Color[count];
                var i = 0;
                foreach (var map in indexMapping)
                {
                    pos[i] = new Color(
                        ((float)map.Item1) / Math.Max(1, spSource.PositionTexture.width - 1),
                        ((float)map.Item2) / Math.Max(1, spTarget.PositionTexture.width - 1),
                        ((float)plotSource.Data[map.Item1].Id) / (spSource.ColorTexture.width - 1), 0);
                    i++;
                }

                indexTexture.SetPixels(pos);
                indexTexture.Apply();
            }

            _renderer.LineCount = count;
            _renderer.PositionStartTex = spSource.PositionTexture;
            _renderer.PositionEndTex = spTarget.PositionTexture;
            _renderer.NullStartTex = spSource.NullTexture;
            _renderer.NullEndTex = spTarget.NullTexture;
            _renderer.TexIndices = indexTexture;

            if (spSource.ColorTexture != null)
                _renderer.ColorTex = spSource.ColorTexture;
        }
    }
}

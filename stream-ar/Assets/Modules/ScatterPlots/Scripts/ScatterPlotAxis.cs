using UnityEngine;
using Assets.Modules.Plots;
using UniRx;
using System.Collections.Generic;
using TMPro;
using Assets.Modules.Networking;

namespace Assets.Modules.ScatterPlots
{
    public class ScatterPlotAxis : MonoBehaviour
    {
        public enum Type { X, Y }

        public TextMeshPro Text;
        public TextMeshPro TextBack;
        public TextMeshPro InvertedText;
        public TextMeshPro InvertedTextBack;

        public GameObject Label;
        public GameObject InvertedLabel;

        private Vector3 _originalLabelPosition;
        private Vector3 _originalInvertedLabelPosition;

        public ScatterPlotTick TickTemplate;
        public Type AxisType;

        private Plot _plot;
        private StreamClient _user;
        private readonly CompositeDisposable _dimDisposables = new CompositeDisposable();
        private readonly CompositeDisposable _labelAnimationDisposables = new CompositeDisposable();
        private List<ScatterPlotTick> _currentTicks = new List<ScatterPlotTick>();
        private Transform _cam;
        private bool _isInverted;

        private void Awake()
        {
            _cam = Camera.main.transform;
            _originalLabelPosition = Label.transform.localPosition;
            _originalInvertedLabelPosition = InvertedLabel.transform.localPosition;
        }

        private void OnEnable()
        {
            _user = StreamClient.Instance;
            _plot = GetComponentInParent<Plot>();
            if (!_plot)
            {
                Debug.LogError("No plot found in parent");
                enabled = false;
            }
            else
            {
                SetText("");

                var dim = AxisType == Type.X ? "DimX" : "DimY";

                _plot.ModelChange()
                    .TakeUntilDisable(this)
                    .Where(changes => changes.Contains(dim))
                    .Subscribe(_ => UpdateDimension());

                if (AxisType == Type.X)
                {
                    _plot.UseSortRx
                        .TakeUntilDisable(this)
                        .ObserveOnMainThread()
                        .Subscribe(_ => UpdateDimension());
                }

                _plot.IsUserInProximity
                    .TakeUntilDisable(this)
                    .Subscribe(_ => UpdateTickVisibility());
                _user.ZenModeRx
                    .TakeUntilDisable(this)
                    .ObserveOnMainThread()
                    .Subscribe(_ => UpdateTickVisibility());
            }
        }

        private void OnDisable()
        {
            _dimDisposables.Clear();
            _labelAnimationDisposables.Clear();
        }



        private void Update()
        {
            var relativeUserPos = _plot.transform.InverseTransformPoint(_cam.position);

            var invertLabels = false;
            if (_isInverted)
            {
                if (AxisType == Type.X)
                    invertLabels = relativeUserPos.y < 0.3f;
                else
                    invertLabels = relativeUserPos.x < 0.3f;
            }
            else
            {
                if (AxisType == Type.X)
                    invertLabels = relativeUserPos.y < -0.3f;
                else
                    invertLabels = relativeUserPos.x < -0.3f;
            }

            if (_isInverted != invertLabels)
            {
                _isInverted = invertLabels;
            }
        }

        private void UpdateLabelVisibility()
        {
            InvertedLabel.SetActive(_isInverted);
            Label.SetActive(!_isInverted);

            foreach (var tick in _currentTicks)
                tick.IsInverted = _isInverted;
        }

        private void UpdateDimension()
        {
            _dimDisposables.Clear();
            var dim = AxisType == Type.X ? _plot.DimX : _plot.DimY;
            var usesSort = _plot.UseSort && AxisType == Type.X;

            if (string.IsNullOrEmpty(dim) || usesSort)
                ClearTicks();
            else
            {
                DataDimensionManager.Instance
                    .GetDimension(dim)
                    .Where(d => d != null)
                    .Subscribe(dataDim =>
                    {
                        ClearTicks();

                        SetText(dataDim.DisplayName);

                        if (!dataDim.HideTicks && !usesSort)
                        {
                            for (var i = 0; i < dataDim.Ticks.Length; i++)
                                SpawnTick(dataDim.Ticks[i], i == 0 || i == dataDim.Ticks.Length - 1);
                        }

                        UpdateTickVisibility();
                        UpdateLabelVisibility();
                    })
                    .AddTo(_dimDisposables);
            }
        }


        private void SpawnTick(DataDimension.Tick tick, bool isEdge)
        {
            var tickGO = Instantiate(TickTemplate, transform);
            tickGO.IsEdge = isEdge;
            if (AxisType == Type.X)
                tickGO.transform.localPosition = new Vector3(tick.Value, 0, 0);
            else
                tickGO.transform.localPosition = new Vector3(0, tick.Value, 0);

            _currentTicks.Add(tickGO);
            tickGO.SetTick(tick);
        }

        private void UpdateTickVisibility()
        {
            _labelAnimationDisposables.Clear();

            var isActive = true; //_plot.IsUserInProximity.Value || _user.ZenMode;

            // enable ticks
            foreach (var tick in _currentTicks)
                tick.gameObject.SetActive(isActive);

            // start label animation to make room for labels
            var targetPosition = _originalLabelPosition;
            var invertedTargetPosition = _originalInvertedLabelPosition;

            if (isActive)
            {
                var offset = 0.2f;
                if (AxisType == Type.X)
                {
                    targetPosition += new Vector3(0, offset, 0);
                    invertedTargetPosition -= new Vector3(0, offset, 0);
                }
                else
                {
                    targetPosition += new Vector3(offset, 0, 0);
                    invertedTargetPosition -= new Vector3(offset, 0, 0);
                }
            }

            //Observable.EveryUpdate()
            //    .TakeWhile(_ => (targetPosition - Label.transform.localPosition).sqrMagnitude > 0.001f)
            //    .Subscribe(_ =>
            //    {
            //        Label.transform.localPosition = Vector3.Lerp(Label.transform.localPosition, targetPosition, 0.08f);
            //        InvertedLabel.transform.localPosition = Vector3.Lerp(InvertedLabel.transform.localPosition, invertedTargetPosition, 0.08f);
            //    })
            //    .AddTo(_labelAnimationDisposables);
            Label.transform.localPosition = targetPosition;
            InvertedLabel.transform.localPosition = invertedTargetPosition;
        }


        private void ClearTicks()
        {
            foreach (var tick in _currentTicks)
                Destroy(tick.gameObject);
            _currentTicks.Clear();
        }

        private void SetText(string text)
        {
            Text.text = text;
            TextBack.text = text;
            InvertedText.text = text;
            InvertedTextBack.text = text;
        }
    }
}

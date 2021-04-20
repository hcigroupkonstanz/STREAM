using Assets.Modules.Core;
using Assets.Modules.Interactions;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;
using UniRx;
using UnityEngine;


namespace Assets.Modules.Plots
{
    public struct PlotData
    {
        public int Id;
        public float X;
        public bool IsXNull;
        public float Y;
        public bool IsYNull;
        public bool IsFiltered;
    }


    [SelectionBase]
    public class Plot : ObservableModel<Plot>, IInteractable
    {
        const float PLOT_USER_PROXIMITY = 1.1f;


        public string GetInteractionType() => "plot";
        public int GetInteractionId() => Id;


        public Transform Visualization;

        public readonly ReactiveProperty<Color> ColorRx = new ReactiveProperty<Color>(new Color());
        public Color Color
        {
            get { return ColorRx.Value; }
            set
            {
                if (ColorRx.Value != value)
                {
                    ColorRx.Value = value;
                    TriggerLocalChange("Color");
                }
            }
        }



        public readonly ReactiveProperty<int> BoundToRx = new ReactiveProperty<int>(-1);
        public int BoundTo
        {
            get { return BoundToRx.Value; }
            set
            {
                if (BoundToRx.Value != value)
                {
                    BoundToRx.Value = value;
                    TriggerLocalChange("BoundTo");
                }
            }
        }



        public readonly ReactiveProperty<bool> LockedToAxisRx = new ReactiveProperty<bool>(false);
        public bool LockedToAxis
        {
            get { return LockedToAxisRx.Value; }
            set
            {
                if (LockedToAxisRx.Value != value)
                {
                    LockedToAxisRx.Value = value;
                    TriggerLocalChange("LockedToAxis");
                }
            }
        }



        public ReactiveProperty<Vector3> PositionRx = new ReactiveProperty<Vector3>(Vector3.zero);
        public Vector3 Position
        {
            get { return PositionRx.Value; }
            set
            {
                if (!PositionRx.Value.Equals(value))
                {
                    PositionRx.Value = value;
                    TriggerLocalChange("Position");
                }
            }
        }

        public readonly ReactiveProperty<Quaternion> RotationRx = new ReactiveProperty<Quaternion>(Quaternion.identity);
        public Quaternion Rotation
        {
            get { return RotationRx.Value; }
            set
            {
                if (!RotationRx.Value.Equals(value))
                {
                    RotationRx.Value = value;
                    TriggerLocalChange("Rotation");
                }
            }
        }


        private string _dimX;
        public string DimX
        {
            get { return _dimX; }
            set
            {
                if (_dimX != value)
                {
                    _dimX = value;
                    TriggerLocalChange("DimX");
                }
            }
        }

        private string _dimY;
        public string DimY
        {
            get { return _dimY; }
            set
            {
                if (_dimY != value)
                {
                    _dimY = value;
                    TriggerLocalChange("DimY");
                }
            }
        }


        private float _positioningOffset;
        public float PositioningOffset
        {
            get => _positioningOffset;
            set
            {
                if (_positioningOffset != value)
                {
                    _positioningOffset = value;
                    TriggerLocalChange("PositioningOffset");
                }
            }
        }


        public readonly ReactiveProperty<bool> UseFilterRx = new ReactiveProperty<bool>(true);
        public bool UseFilter
        {
            get => UseFilterRx.Value;
            set
            {
                if (UseFilterRx.Value != value)
                {
                    UseFilterRx.Value = value;
                    TriggerLocalChange("UseFilter");
                }
            }
        }

        public readonly ReactiveProperty<bool> UseSortRx = new ReactiveProperty<bool>(false);
        public bool UseSort
        {
            get => UseSortRx.Value;
            set
            {
                if (UseSortRx.Value != value)
                {
                    UseSortRx.Value = value;
                    TriggerLocalChange("UseSort");
                }
            }
        }


        public readonly ReactiveProperty<bool> UseColorRx = new ReactiveProperty<bool>(false);
        public bool UseColor
        {
            get => UseColorRx.Value;
            set
            {
                if (UseColorRx.Value != value)
                {
                    UseColorRx.Value = value;
                    TriggerLocalChange("UseColor");
                }
            }
        }

        public readonly ReactiveProperty<PlotData[]> DataRx = new ReactiveProperty<PlotData[]>(new PlotData[0]);
        public PlotData[] Data
        {
            get => DataRx.Value;
            set
            {
                DataRx.Value = value;
                TriggerLocalChange("Data");
            }
        }



#if STREAM_AR
        /*
         * unsynced
         */
        public bool IsPositioning { get; set; }
        // global coordinate system
        public Vector3 ActualPosition { get; set; }
        // global coordinate system
        public Quaternion ActualRotation { get; set; }
        public ReactiveProperty<bool> IsUserInProximity { get; private set; } = new ReactiveProperty<bool>(false);

        private StreamClient _client;
        private Transform _cam;
        private void OnEnable()
        {
            _client = StreamClient.Instance;
            _cam = Camera.main.transform;
        }

        private void Update()
        {
            IsUserInProximity.Value = (_client.LookingAtType == "plot" && _client.LookingAtId == Id)
                || (_client.SelectedType == "plot" && _client.SelectedId == Id)
                || Mathf.Abs((_cam.position - transform.position).magnitude) < PLOT_USER_PROXIMITY;
        }
#endif

        protected override void OnDestroy()
        {
            base.OnDestroy();
            BoundToRx.Dispose();
            ColorRx.Dispose();
            DataRx.Dispose();
            LockedToAxisRx.Dispose();
            PositionRx.Dispose();
            RotationRx.Dispose();
            UseColorRx.Dispose();
            UseFilterRx.Dispose();
#if STREAM_AR
            IsUserInProximity.Dispose();
#endif
        }


        protected override void ApplyRemoteUpdate(JObject updates)
        {
            var jColor = updates["color"];
            if (jColor != null)
            {
                MainThreadDispatcher.Post(_ =>
                {
                    var htmlColor = jColor.Value<string>();
                    if (ColorUtility.TryParseHtmlString(htmlColor, out var color))
                        ColorRx.Value = color;
                }, this);
            }


            var boundTo = updates["boundTo"];
            if (boundTo != null)
                BoundToRx.Value = boundTo.Value<int>();

            var lockedToAxis = updates["lockedToAxis"];
            if (lockedToAxis != null)
                LockedToAxisRx.Value = lockedToAxis.Value<bool>();

            var jPos = updates["position"];
            if (jPos != null)
            {
                var pos = jPos.Select(m => (float)m).ToArray();
                if (pos.Length == 3)
                    PositionRx.Value = new Vector3(pos[0], pos[1], pos[2]);
            }

            var jRot = updates["rotation"];
            if (jRot != null)
            {
                var rot = jRot.Select(m => (float)m).ToArray();
                if (rot.Length == 4)
                    RotationRx.Value = new Quaternion(rot[0], rot[1], rot[2], rot[3]);
            }

            var dimX = updates["dimX"];
            if (dimX != null)
                _dimX = dimX.Value<string>();

            var dimY = updates["dimY"];
            if (dimY != null)
                _dimY = dimY.Value<string>();

            var posOffset = updates["positioningOffset"];
            if (posOffset != null)
                _positioningOffset = posOffset.Value<float>();

            var useFilter = updates["useFilter"];
            if (useFilter != null)
                UseFilterRx.Value = useFilter.Value<bool>();

            var useColor = updates["useColor"];
            if (useColor != null)
                UseColorRx.Value = useColor.Value<bool>();

            var useSort = updates["useSort"];
            if (useSort != null)
                UseSortRx.Value = useSort.Value<bool>();


#if STREAM_AR
            var plotData = updates["data"];
            if (plotData != null)
                DataRx.Value = plotData.Select(n =>
                    new PlotData
                    {
                        Id = n[0].Value<int>(),
                        IsXNull = n[1].Type == JTokenType.Null,
                        X = n[1].Type != JTokenType.Null ? n[1].Value<float>() : 0,
                        IsYNull = n[2].Type == JTokenType.Null,
                        Y = n[2].Type != JTokenType.Null ? n[2].Value<float>() : 0,
                        IsFiltered = n[3].Value<int>() == 1
                    }
                ).ToArray();
#endif
        }


        public override JObject ToJson()
        {
            return new JObject
            {
                { "id", Id },
                { "color", ColorUtility.ToHtmlStringRGB(Color) },
                { "boundTo", BoundTo },
                { "lockedToAxis", LockedToAxis },
                { "position", new JArray { Position.x, Position.y, Position.z } },
                { "rotation", new JArray { Rotation.x, Rotation.y, Rotation.z, Rotation.w } },
                { "positioningOffset", _positioningOffset },
                { "useColor", UseColor },
                { "useSort", UseSort },
                { "useFilter", UseFilter },
                { "dimX", _dimX },
                { "dimY", _dimY }
            };
        }
    }
}

using Assets.Modules.Core;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;
using UnityEngine;
using UniRx;
using Assets.Modules.ArClients;

namespace Assets.Modules.Networking
{
    [DisallowMultipleComponent]
    public class StreamClient : ObservableModel<StreamClient>
    {
        const string NAME_PROP = "client_name";

        private static StreamClient _instance;
        public static StreamClient Instance
        {
            get
            {
                if (!_instance)
                    _instance = new GameObject($"[StreamClient]").AddComponent<StreamClient>();
                return _instance;
            }
        }

        public readonly ReactiveProperty<ArClient> SpectatingRx = new ReactiveProperty<ArClient>();
        public ArClient Spectating
        {
            get => SpectatingRx.Value;
            set => SpectatingRx.Value = value;
        }

        public readonly ReactiveProperty<Matrix4x4> OffsetMatrixRx = new ReactiveProperty<Matrix4x4>(Matrix4x4.identity);
        public Matrix4x4 OffsetMatrix
        {
            get => OffsetMatrixRx.Value;
            set
            {
                OffsetMatrixRx.Value = value;
                TriggerLocalChange("OffsetMatrix");
            }
        }


        public readonly ReactiveProperty<bool> IsCalibratingRx = new ReactiveProperty<bool>(true);
        public bool IsCalibrating
        {
            get => IsCalibratingRx.Value;
            set
            {
                if (IsCalibratingRx.Value != value)
                {
                    IsCalibratingRx.Value = value;
                    TriggerLocalChange("IsCalibrating");
                }
            }
        }

        public readonly ReactiveProperty<bool> DebugIndicatorsRx = new ReactiveProperty<bool>(false);
        public bool DebugIndicators
        {
            get => DebugIndicatorsRx.Value;
            set
            {
                if (DebugIndicatorsRx.Value != value)
                {
                    DebugIndicatorsRx.Value = value;
                    TriggerLocalChange("DebugIndicators");
                }
            }
        }


        private string _name;
        public string Name
        {
            get => _name;
            set
            {
                if (_name != value && !String.IsNullOrEmpty(value))
                {
                    _name = value;
                    PlayerPrefs.SetString(NAME_PROP, value);
                    PlayerPrefs.Save();
                }
            }
        }


        private Vector3 _position;
        public Vector3 Position
        {
            get => _position;
            set
            {
                if (_position != value)
                {
                    _position = value;
                    TriggerLocalChange("Position");
                }
            }
        }

        private Quaternion _rotation;
        public Quaternion Rotation
        {
            get => _rotation;
            set
            {
                if (_rotation != value)
                {
                    _rotation = value;
                    TriggerLocalChange("Rotation");
                }
            }
        }

        public readonly ReactiveProperty<int> SelectedIdRx = new ReactiveProperty<int>(-1);
        public int SelectedId
        {
            get => SelectedIdRx.Value;
            set
            {
                if (SelectedIdRx.Value != value)
                {
                    SelectedIdRx.Value = value;
                    TriggerLocalChange("SelectedId");
                }
            }
        }

        public readonly ReactiveProperty<string> SelectedTypeRx = new ReactiveProperty<string>("");
        public string SelectedType
        {
            get => SelectedTypeRx.Value;
            set
            {
                if (SelectedTypeRx.Value != value)
                {
                    SelectedTypeRx.Value = value;
                    TriggerLocalChange("SelectedType");
                }
            }
        }


        public readonly ReactiveProperty<string> SelectedMetadataRx = new ReactiveProperty<string>("");
        public string SelectedMetadata
        {
            get => SelectedMetadataRx.Value;
            set
            {
                if (SelectedMetadataRx.Value != value)
                {
                    SelectedMetadataRx.Value = value;
                    TriggerLocalChange("SelectedMetadata");
                }
            }
        }


        public readonly ReactiveProperty<int> LookingAtIdRx = new ReactiveProperty<int>(-1);
        public int LookingAtId
        {
            get => LookingAtIdRx.Value;
            set
            {
                if (LookingAtIdRx.Value != value)
                {
                    LookingAtIdRx.Value = value;
                    TriggerLocalChange("LookingAtId");
                }
            }
        }

        public readonly ReactiveProperty<string> LookingAtTypeRx = new ReactiveProperty<string>("");
        public string LookingAtType
        {
            get => LookingAtTypeRx.Value;
            set
            {
                if (LookingAtTypeRx.Value != value)
                {
                    LookingAtTypeRx.Value = value;
                    TriggerLocalChange("LookingAtType");
                }
            }
        }


        public readonly ReactiveProperty<float> SelectionProgressRx = new ReactiveProperty<float>(0);
        public float SelectionProgress
        {
            get => SelectionProgressRx.Value;
            set
            {
                if (SelectionProgressRx.Value != value)
                {
                    SelectionProgressRx.Value = value;
                    TriggerLocalChange("SelectionProgress");
                }
            }
        }



        public readonly ReactiveProperty<float> PlacementHeightOffsetRx = new ReactiveProperty<float>(0);
        public float PlacementHeightOffset
        {
            get => PlacementHeightOffsetRx.Value;
            set
            {
                if (PlacementHeightOffsetRx.Value != value)
                {
                    PlacementHeightOffsetRx.Value = value;
                    TriggerLocalChange("PlacementHeightOffset");
                }
            }
        }


        private string _indicatorPosition;
        public string IndicatorPosition
        {
            get => _indicatorPosition;
            set
            {
                if (_indicatorPosition != value)
                {
                    _indicatorPosition = value;
                    TriggerLocalChange("IndicatorPosition");
                }
            }
        }


        public ReactiveProperty<bool> ZenModeRx = new ReactiveProperty<bool>(false);
        public bool ZenMode
        {
            get => ZenModeRx.Value;
            set
            {
                if (ZenModeRx.Value != value)
                {
                    ZenModeRx.Value = value;
                    TriggerLocalChange("ZenMode");
                }
            }
        }


        public bool IsObserver
        {
#if STREAM_OBSERVER
            get => true;
#else
            get => false;
#endif
        }


        private WebServerConnection _connection;
        private readonly CompositeDisposable _disposables = new CompositeDisposable();
        private BehaviorSubject<bool> _isInitialized = new BehaviorSubject<bool>(false);
        public IObservable<bool> Initialized => _isInitialized.Where(x => x).First();


        private void OnEnable()
        {
            if (_instance != null)
            {
                Debug.LogError("Detected multiple StreamClient instances!");
                Destroy(gameObject);
                return;
            }

            var name = PlayerPrefs.GetString(NAME_PROP);
            if (String.IsNullOrEmpty(name))
                Name = $"{SystemInfo.deviceName} ({SystemInfo.deviceModel} // {SystemInfo.deviceType})";
            else
                Name = name;

            Debug.Log($"Native device name: {SystemInfo.deviceName} ({SystemInfo.deviceModel} // {SystemInfo.deviceType})");

            _connection = WebServerConnection.Instance;
            _connection.OnConnected += OnServerConnected;
            _connection.OnDisconnected += OnServerDisconnected;
            LocalChange()
                .Subscribe(async changes =>
                {
                    await _connection.Connected;
                    await Observable.Start(() => _connection.SendCommand(NetworkChannel.UNITYCLIENT, "update", ToJson(changes)));
                })
                .AddTo(_disposables);

            WebServerConnection.ServerMessagesAsync
                .TakeUntilDisable(this)
                .Where(p => p.channel == NetworkChannel.UNITYCLIENT)
                .Subscribe(p => OnServerMessage(p.command, p.payload));

            OnServerConnected();
        }

        private void OnDisable()
        {
            _connection.OnConnected -= OnServerConnected;
            _connection.OnDisconnected -= OnServerDisconnected;
            OnServerDisconnected();
            _disposables.Clear();
        }


        private void OnServerConnected()
        {
            if (_isInitialized.Value)
                return;

            _connection.SendCommand(NetworkChannel.UNITYCLIENT, "request", null);
        }


        private void OnServerDisconnected()
        {
            if (!_isInitialized.Value)
                return;

            _isInitialized.OnNext(false);
        }


        private void OnServerMessage(string command, JToken payload)
        {
            if (command == "update")
                RemoteUpdate(payload as JObject);
            else if (command == "request")
            {
                RemoteUpdate(payload as JObject);
                _isInitialized.OnNext(true);
                _connection.SendCommand(NetworkChannel.UNITYCLIENT, "update", ToJson());
            }
        }


        public override JObject ToJson()
        {
            var m = OffsetMatrix;
            return new JObject
            {
                { "id", Id },
                { "name", _name },
                { "rotation", new JArray { _rotation.x, _rotation.y, _rotation.z, _rotation.w } },
                { "position", new JArray { _position.x, _position.y, _position.z } },
                { "isCalibrating", IsCalibrating },
                { "debugIndicators", DebugIndicators },
                { "offsetMatrix", new JArray
                    {
                        m[0, 0], m[0, 1], m[0, 2], m[0, 3],
                        m[1, 0], m[1, 1], m[1, 2], m[1, 3],
                        m[2, 0], m[2, 1], m[2, 2], m[2, 3],
                        m[3, 0], m[3, 1], m[3, 2], m[3, 3],
                    }
                },
                { "selectedType", SelectedType },
                { "selectedId", SelectedId },
                { "selectedMetadata", SelectedMetadata },
                { "lookingAtType", LookingAtType },
                { "lookingAtId", LookingAtId },
                { "placementHeightOffset", PlacementHeightOffset },
                { "indicatorPosition", _indicatorPosition },
                { "zenMode", ZenMode },
                { "selectionProgress", SelectionProgress },
                { "isObserver", IsObserver }
            };
        }


        protected override void ApplyRemoteUpdate(JObject updates)
        {
            var id = updates["id"];
            if (id != null)
                Id = id.Value<int>();

            var name = updates["name"];
            if (name != null)
                _name = name.Value<string>();

            var offsetMatrix = updates["offsetMatrix"];
            if (offsetMatrix != null)
            {
                var vals = offsetMatrix.Select(x => (float)x).ToArray();
                if (vals.Length < 16)
                {
                    OffsetMatrixRx.Value = Matrix4x4.identity;
                }
                else
                {
                    OffsetMatrixRx.Value = new Matrix4x4
                    {
                        m00 = vals[0],
                        m01 = vals[1],
                        m02 = vals[2],
                        m03 = vals[3],
                        m10 = vals[4],
                        m11 = vals[5],
                        m12 = vals[6],
                        m13 = vals[7],
                        m20 = vals[8],
                        m21 = vals[9],
                        m22 = vals[10],
                        m23 = vals[11],
                        m30 = vals[12],
                        m31 = vals[13],
                        m32 = vals[14],
                        m33 = vals[15],
                    };
                }
            }

            var selectedId = updates["selectedId"];
            if (selectedId != null)
                SelectedIdRx.Value = selectedId.Value<int>();

            var selectedType = updates["selectedType"];
            if (selectedType != null)
                SelectedTypeRx.Value = selectedType.Value<string>();

            var selectedMetadata = updates["selectedMetadata"];
            if (selectedMetadata != null)
                SelectedMetadataRx.Value = selectedMetadata.Value<string>();


            var isCalibrating = updates["isCalibrating"];
            if (isCalibrating != null)
                IsCalibratingRx.Value = isCalibrating.Value<bool>();

            var debugIndicators = updates["debugIndicators"];
            if (debugIndicators != null)
                DebugIndicatorsRx.Value = debugIndicators.Value<bool>();

            var placementHeightOffset = updates["placementHeightOffset"];
            if (placementHeightOffset != null)
                PlacementHeightOffsetRx.Value = placementHeightOffset.Value<float>();

            var indicatorPosition = updates["indicatorPosition"];
            if (indicatorPosition != null)
                _indicatorPosition = indicatorPosition.Value<string>();

            var zenMode = updates["zenMode"];
            if (zenMode != null)
                ZenModeRx.Value = zenMode.Value<bool>();

            //var selectionProgress = updates["selectionProgress"];
            //if (selectionProgress != null)
            //    SelectionProgressRx.Value = selectionProgress.Value<float>();
        }
    }
}

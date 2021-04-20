using Assets.Modules.Core;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System.Linq;
using System.Collections.Generic;
using System;
using Assets.Modules.Tracking;
using UnityEngine;
using UniRx;

namespace Assets.Modules.WebClients
{
    [SelectionBase]
    public class WebClient : ObservableModel<WebClient>
    {
        public GameObject Socket;

        [Serializable]
        public class Menu
        {
            public MenuItem topleft;
            public MenuItem topright;
            public MenuItem left;
            public MenuItem center;
            public MenuItem right;
            public MenuItem bottomleft;
            public MenuItem bottomright;

            public MenuItem[] options = new MenuItem[] { };
            public string selectedMenu = "";
            public JObject selectedMenuArgs = null;
            public bool hide;
        }


        [Serializable]
        public class MenuItem
        {
            public string icon;
            public string action;
            public string actionName;
            public string voice;
            public string voiceName;
            public JObject metadata;
        }


        private int[] _trackers = new[] { -1 };
        public int[] Trackers
        {
            get => _trackers;
            set
            {
                if (_trackers != value)
                {
                    _trackers = value ?? new[] { -1 };
                    TriggerLocalChange("Trackers");
                }
            }
        }

        private int _resolutionWidth;
        public int ResolutionWidth
        {
            get => _resolutionWidth;
            set
            {
                if (_resolutionWidth != value)
                {
                    _resolutionWidth = value;
                    TriggerLocalChange("ResolutionWidth");
                }
            }
        }


        private int _resolutionHeight;
        public int ResolutionHeight
        {
            get => _resolutionHeight;
            set
            {
                if (_resolutionHeight != value)
                {
                    _resolutionHeight = value;
                    TriggerLocalChange("ResolutionHeight");
                }
            }
        }


        private float _ppi;
        public float Ppi
        {
            get => _ppi;
            set
            {
                if (_ppi != value)
                {
                    _ppi = value;
                    TriggerLocalChange("Ppi");
                }
            }
        }

        private int _owner;
        public int Owner
        {
            get => _owner;
            set
            {
                if (_owner != value)
                {
                    _owner = value;
                    TriggerLocalChange("Owner");
                }
            }
        }

        private bool _isVoiceActive;
        public bool IsVoiceActive
        {
            get => _isVoiceActive;
            set
            {
                if (_isVoiceActive != value)
                {
                    _isVoiceActive = value;
                    TriggerLocalChange("IsVoiceActive");
                }
            }
        }


        private bool _isCalibrating;
        public bool IsCalibrating
        {
            get => _isCalibrating;
            set
            {
                if (_isCalibrating != value)
                {
                    _isCalibrating = value;
                    TriggerLocalChange("IsCalibrating");
                }
            }
        }


        private Matrix4x4[] _offsetMatrices;
        public Matrix4x4[] OffsetMatrices
        {
            get => _offsetMatrices;
            set
            {
                _offsetMatrices = value ?? new Matrix4x4[0];
                TriggerLocalChange("OffsetMatrices");
            }
        }


        private string _name;
        public string Name
        {
            get { return _name; }
            set
            {
                if (_name != value)
                {
                    _name = value;
                    TriggerLocalChange("Name");
                }
            }
        }


        public static readonly string ORIENTATION_VERTICAL = "vertical";
        public static readonly string ORIENTATION_HORIZONTAL = "horizontal";
        public static readonly string ORIENTATION_INBETWEEN = "inbetween";

        private string _orientation;
        public string Orientation
        {
            get => _orientation;
            set
            {
                if (_orientation != value)
                {
                    _orientation = value;
                    TriggerLocalChange("Orientation");
                }
            }
        }


        private int _lookingAtId = -1;
        public int LookingAtId
        {
            get => _lookingAtId;
            set
            {
                if (_lookingAtId != value)
                {
                    _lookingAtId = value;
                    TriggerLocalChange("LookingAtId");
                }
            }
        }

        private string _lookingAtType;
        public string LookingAtType
        {
            get => _lookingAtType;
            set
            {
                if (_lookingAtType != value)
                {
                    _lookingAtType = value;
                    TriggerLocalChange("LookingAtType");
                }
            }
        }


        public readonly ReactiveProperty<Menu> ScreenMenuRx = new ReactiveProperty<Menu>(new Menu());
        public Menu ScreenMenu { get => ScreenMenuRx.Value; }


        private TrackerManager _trackerManager;

        protected override void Awake()
        {
            base.Awake();
            ModelChange()
                .TakeUntilDestroy(this)
                .Subscribe(_ => name = $"WebClient ({Id}) '{_name}'");
        }

        private void OnEnable()
        {
            _trackerManager = FindObjectOfType<TrackerManager>();
            if (!_trackerManager)
            {
                Debug.LogWarning("Unable to find TrackerManager, disabling WebClient");
                gameObject.SetActive(false);
            }
        }

        private void LateUpdate()
        {
            var activeTrackers = _trackers
                .Select(id => _trackerManager.Get(id))
                .Where(tracker => tracker != null && tracker.IsActive)
                .ToArray();

            Socket?.SetActive(activeTrackers.Length > 0);

            var avgPose = new List<Tuple<Vector3, Quaternion>>();

            for (var i = 0; i < _trackers.Length; i++)
            {
                var tracker = activeTrackers.FirstOrDefault(t => t.Id == _trackers[i]);

                if (!tracker || i >= _offsetMatrices.Length)
                    continue;

                var matrix = _offsetMatrices[i];
                avgPose.Add(Tuple.Create(
                    tracker.transform.position + tracker.transform.rotation * MathUtility.PositionFromMatrix(matrix),
                    tracker.transform.rotation * MathUtility.QuaternionFromMatrix(matrix)
                ));
            }


            transform.position = MathUtility.Average(avgPose.Select(t => t.Item1));
            transform.rotation = MathUtility.Average(avgPose.Select(t => t.Item2));
        }


        private void OnDrawGizmos()
        {
            if (Application.isPlaying)
            {
#if STREAM_TRACKING
                var owner = ArClients.ArClientManager.Instance.Get(Owner);
                if (owner)
                    Gizmos.DrawLine(transform.position, owner.Target.position);
#endif


                var activeTrackers = _trackers
                    .Where(id => id >= 0)
                    .Select(id => _trackerManager.Get(id))
                    .Where(tracker => tracker != null && tracker.IsActive)
                    .ToArray();

                for (var i = 0; i < _trackers.Length; i++)
                {
                    var tracker = activeTrackers.FirstOrDefault(t => t.Id == _trackers[i]);

                    if (!tracker || i >= _offsetMatrices.Length)
                        continue;

                    var matrix = _offsetMatrices[i];
                    GizmosExtension.DrawRotation(
                        tracker.transform.position + tracker.transform.rotation * MathUtility.PositionFromMatrix(matrix),
                        tracker.transform.rotation * MathUtility.QuaternionFromMatrix(matrix),
                        0.1f);
                }
            }
        }

        /**
         *  Returns device width x device height in cm based on resolution and PPI
         */
        public Vector2 GetDeviceSizeCm()
        {
            const float INCH_TO_CM = 2.54f;
            return new Vector2(_resolutionWidth / _ppi * INCH_TO_CM, _resolutionHeight / _ppi * INCH_TO_CM);
        }


        protected override void ApplyRemoteUpdate(JObject updates)
        {
            var name = updates["name"];
            if (name != null)
                _name = name.Value<string>();

            var resolutionWidth = updates["resolutionWidth"];
            if (resolutionWidth != null)
                _resolutionWidth = resolutionWidth.Value<int>();

            var resolutionHeight = updates["resolutionHeight"];
            if (resolutionHeight != null)
                _resolutionHeight = resolutionHeight.Value<int>();

            var ppi = updates["ppi"];
            if (ppi != null)
                _ppi = ppi.Value<float>();

            var trackers = updates["trackers"];
            if (trackers != null)
                _trackers = trackers.Select(x => (int)x).ToArray();

#if STREAM_AR
            var owner = updates["owner"];
            if (owner != null)
                Owner = owner.Value<int>();
#endif

            var offsetMatrices = updates["offsetMatrices"];
            if (offsetMatrices != null)
            {
                _offsetMatrices = offsetMatrices.Select(matrix =>
                {
                    var vals = matrix.Select(val => (float)val).ToArray();

                    if (vals.Length < 16)
                        return Matrix4x4.identity;
                    else
                        return new Matrix4x4
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
                }).ToArray();
            }

            var isVoiceActive = updates["isVoiceActive"];
            if (isVoiceActive != null)
                _isVoiceActive = isVoiceActive.Value<bool>();

            var isCalibrating = updates["isCalibrating"];
            if (isCalibrating != null)
                _isCalibrating = isCalibrating.Value<bool>();

            var orientation = updates["orientation"];
            if (orientation != null)
                _orientation = orientation.Value<string>();

            var lookingAtType = updates["lookingAtType"];
            if (lookingAtType != null)
                _lookingAtType = lookingAtType.Value<string>();

            var lookingAtId = updates["lookingAtId"];
            if (lookingAtId != null)
                _lookingAtId = lookingAtId.Value<int>();

            JObject screenMenu = updates["screenMenu"] as JObject;
            if (screenMenu != null)
                ScreenMenuRx.Value = screenMenu.ToObject<Menu>();
        }

        public override JObject ToJson()
        {
            var jMatrices = new JArray();

            if (_offsetMatrices != null)
            {
                foreach (var m in _offsetMatrices)
                {
                    jMatrices.Add(new JArray
                    {
                        m[0, 0], m[0, 1], m[0, 2], m[0, 3],
                        m[1, 0], m[1, 1], m[1, 2], m[1, 3],
                        m[2, 0], m[2, 1], m[2, 2], m[2, 3],
                        m[3, 0], m[3, 1], m[3, 2], m[3, 3],
                    });
                }
            }

            return new JObject
            {
                { "id", Id },
                { "name", _name },
                { "orientation", _orientation },
                { "trackers", new JArray(_trackers) },
                { "owner", _owner },
                { "isVoiceActive", _isVoiceActive },
                { "isCalibrating", _isCalibrating },
                { "offsetMatrices", jMatrices },
                { "lookingAtType", LookingAtType },
                { "lookingAtId", LookingAtId }
            };
        }
    }
}

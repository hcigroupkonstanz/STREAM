using Assets.Modules.Core;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.ArClients
{
    [SelectionBase]
    public class ArClient : ObservableModel<ArClient>
    {
        public Transform Target;

        private string _name;
        public string Name
        {
            get => _name;
            set
            {
                if (_name != value)
                {
                    _name = value;
                    gameObject.name = $"ArClient '{_name}'";
                    TriggerLocalChange("Name");
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


        public readonly ReactiveProperty<Matrix4x4> OffsetMatrixRx = new ReactiveProperty<Matrix4x4>(Matrix4x4.identity);
        public Matrix4x4 OffsetMatrix
        {
            get => OffsetMatrixRx.Value;
            set
            {
                if (OffsetMatrixRx.Value != value)
                {
                    OffsetMatrixRx.Value = value;
                    TriggerLocalChange("OffsetMatrix");
                }
            }
        }


        public readonly ReactiveProperty<Vector3> PositionRx = new ReactiveProperty<Vector3>(Vector3.zero);
        public Vector3 Position
        {
            get => PositionRx.Value;
            set
            {
                if (PositionRx.Value != value)
                {
                    PositionRx.Value = value;
                    TriggerLocalChange("Position");
                }
            }
        }

        public readonly ReactiveProperty<Quaternion> RotationRx = new ReactiveProperty<Quaternion>(Quaternion.identity);
        public Quaternion Rotation
        {
            get => RotationRx.Value;
            set
            {
                if (RotationRx.Value != value)
                {
                    RotationRx.Value = value;
                    TriggerLocalChange("Rotation");
                }
            }
        }


        public readonly ReactiveProperty<bool> IsObserverRx = new ReactiveProperty<bool>(false);
        public bool IsObserver
        {
            get => IsObserverRx.Value;
        }


        private async void OnEnable()
        {
            PositionRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(pos => Target.localPosition = pos);

            RotationRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(rot => Target.localRotation = rot);

            OffsetMatrixRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(mat =>
                {
                    transform.localPosition = MathUtility.PositionFromMatrix(mat);
                    transform.localRotation = mat.rotation;
                    transform.localScale = mat.lossyScale;
                });

#if MIDAIR_AR
            await ArtsClient.Instance.Initialized;

            if (Id == ArtsClient.Instance.Id)
                Target.gameObject.SetActive(false);
#endif
        }

        protected override void OnDestroy()
        {
            base.OnDestroy();
            OffsetMatrixRx.Dispose();
            PositionRx.Dispose();
            RotationRx.Dispose();
        }

        protected override void ApplyRemoteUpdate(JObject updates)
        {
            var name = updates["name"];
            if (name != null)
                _name = name.Value<string>();

            var isCalibrating = updates["isCalibrating"];
            if (isCalibrating != null)
                _isCalibrating = isCalibrating.Value<bool>();

            var isObserver = updates["isObserver"];
            if (isObserver != null)
                IsObserverRx.Value = isObserver.Value<bool>();

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

            var position = updates["position"];
            if (position != null)
            {
                var pos = position.Select(m => (float)m).ToArray();
                PositionRx.Value = new Vector3(pos[0], pos[1], pos[2]);
            }

            var rotation = updates["rotation"];
            if (rotation != null)
            {
                var rot = rotation.Select(m => (float)m).ToArray();
                RotationRx.Value = new Quaternion(rot[0], rot[1], rot[2], rot[3]);
            }
        }


        public override JObject ToJson()
        {
            var m = OffsetMatrix;
            return new JObject
            {
                { "id", Id },
                { "name", _name },
                { "rotation", new JArray { Rotation.x, Rotation.y, Rotation.z, Rotation.w } },
                { "position", new JArray { Position.x, Position.y, Position.z } },
                { "isCalibrating", _isCalibrating },
                { "offsetMatrix", new JArray
                    {
                        m[0, 0], m[0, 1], m[0, 2], m[0, 3],
                        m[1, 0], m[1, 1], m[1, 2], m[1, 3],
                        m[2, 0], m[2, 1], m[2, 2], m[2, 3],
                        m[3, 0], m[3, 1], m[3, 2], m[3, 3],
                    }
                },
            };
        }
    }
}

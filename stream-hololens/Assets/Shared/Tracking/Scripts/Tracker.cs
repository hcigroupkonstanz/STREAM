using Assets.Modules.Core;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Tracking
{
    [SelectionBase]
    public class Tracker : ObservableModel<Tracker>
    {
#if MIDAIR_TRACKING
        public float LastUpdate;
#endif


        public readonly ReactiveProperty<string> HardwareIdRx = new ReactiveProperty<string>();
        public string HardwareId
        {
            get => HardwareIdRx.Value;
            set
            {
                if (HardwareIdRx.Value != value)
                {
                    HardwareIdRx.Value = value;
                    TriggerLocalChange("HardwareId");
                }
            }
}

        public readonly ReactiveProperty<string> NameRx = new ReactiveProperty<string>("");
        public string Name
        {
            get => NameRx.Value;
            set
            {
                if (NameRx.Value != value)
                {
                    NameRx.Value = value;
                    TriggerLocalChange("Name");
                }
            }
        }


        private bool _isActive;
        public bool IsActive
        {
            get => _isActive;
            set
            {
                if (_isActive != value)
                {
                    _isActive = value;
                    TriggerLocalChange("IsActive");

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



        protected override void Awake()
        {
            base.Awake();

            Observable.Merge(NameRx, HardwareIdRx)
                .ObserveOnMainThread()
                .Subscribe(_ => UpdateName());

            ModelChange()
                .Subscribe(_ =>
                {
                    gameObject.SetActive(_isActive);
                    transform.localPosition = _position;
                    transform.localRotation = _rotation;
                })
                .AddTo(this);
        }

        protected override void OnDestroy()
        {
            base.OnDestroy();
            HardwareIdRx.Dispose();
            NameRx.Dispose();
        }


        private void UpdateName()
        {
            if (string.IsNullOrEmpty(Name))
                gameObject.name = $"Tracker ({Id}) [{HardwareId}]";
            else
                gameObject.name = $"Tracker ({Id}) '{Name}'";
        }


        protected override void ApplyRemoteUpdate(JObject updates)
        {
#if MIDAIR_TRACKING
            var id = updates["id"];
            if (id != null)
            {
                Id = id.Value<int>();
                UpdateName();
            }
#elif MIDAIR_AR
            var hardwareId = updates["hardwareId"];
            if (hardwareId != null)
                HardwareIdRx.Value = hardwareId.Value<string>();
#endif

            var name = updates["name"];
            if (name != null)
                NameRx.Value = name.Value<string>();

#if MIDAIR_AR
            var isActive = updates["isActive"];
            if (isActive != null)
                _isActive = isActive.Value<bool>();

            var jpos = updates["position"];
            if (jpos != null)
            {
                var pos = jpos.Select(m => (float)m).ToArray();
                _position = new Vector3(pos[0], pos[1], pos[2]);
            }

            var jrot = updates["rotation"];
            if (jrot != null)
            {
                var rot = jrot.Select(m => (float)m).ToArray();
                _rotation = new Quaternion(rot[0], rot[1], rot[2], rot[3]);
            }
#endif
        }

        public override JObject ToJson()
        {
            return new JObject
            {
                { "id", Id },
                { "hardwareId", HardwareId },
                { "name", Name },
#if MIDAIR_TRACKING
                { "isActive", _isActive },
                { "position", new JArray(_position.x, _position.y, _position.z) },
                { "rotation", new JArray(_rotation.x, _rotation.y, _rotation.z, _rotation.w) },
#endif
            };
        }
    }
}

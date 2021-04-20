using Assets.Modules.Core;
using Assets.Modules.Interactions;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    [SelectionBase]
    public class Link : ObservableModel<Link>, IInteractable
    {
        const float LINK_USER_PROXIMITY = 1.1f;

        public string GetInteractionType() => "link";
        public int GetInteractionId() => Id;


        public Transform Visualization;

        public readonly ReactiveProperty<int> UpstreamRx = new ReactiveProperty<int>(-1);
        public int Upstream
        {
            get => UpstreamRx.Value;
            set
            {
                if (UpstreamRx.Value != value)
                {
                    UpstreamRx.Value = value;
                    TriggerLocalChange("Upstream");
                }
            }
        }



        public readonly ReactiveProperty<int> DownstreamRx = new ReactiveProperty<int>(-1);
        public int Downstream
        {
            get => DownstreamRx.Value;
            set
            {
                if (DownstreamRx.Value != value)
                {
                    DownstreamRx.Value = value;
                    TriggerLocalChange("Downstream");
                }
            }
        }



        private Vector3 _placingPosition = Vector3.zero;
        public Vector3 PlacingPosition
        {
            get => _placingPosition;
            set
            {
                if (_placingPosition != value)
                {
                    _placingPosition = value;
                    TriggerLocalChange("PlacingPosition");
                }
            }
        }



        private Quaternion _placingRotation = Quaternion.identity;
        public Quaternion PlacingRotation
        {
            get => _placingRotation;
            set
            {
                if (_placingRotation != value)
                {
                    _placingRotation = value;
                    TriggerLocalChange("PlacingRotation");
                }
            }
        }


        public readonly ReactiveProperty<int> CreatedByRx = new ReactiveProperty<int>(-1);
        public int CreatedBy
        {
            get => CreatedByRx.Value;
            set
            {
                if (CreatedByRx.Value != value)
                {
                    CreatedByRx.Value = value;
                    TriggerLocalChange("CreatedBy");
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


#if STREAM_AR

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
            IsUserInProximity.Value = (_client.LookingAtType == "link" && _client.LookingAtId == Id)
                || (_client.SelectedType == "link" && _client.SelectedId == Id)
                || Mathf.Abs((_cam.position - Visualization.position).magnitude) < LINK_USER_PROXIMITY;
        }

#endif


        protected override void OnDestroy()
        {
            base.OnDestroy();
            CreatedByRx.Dispose();
            DownstreamRx.Dispose();
            UpstreamRx.Dispose();

#if STREAM_AR
            IsUserInProximity.Dispose();
#endif
        }

        public override JObject ToJson()
        {
            return new JObject
            {
                { "id", Id },
                { "upstream", Upstream },
                { "downstream", Downstream },
                { "useColor", UseColor },
                { "useSort", UseSort },
                { "createdBy", CreatedBy },
                { "placingPosition", new JArray { _placingPosition.x, _placingPosition.y, _placingPosition.z } },
                { "placingRotation", new JArray { _placingRotation.x, _placingRotation.y, _placingRotation.z, _placingRotation.w } },
            };
        }

        protected override void ApplyRemoteUpdate(JObject updates)
        {
            var upstream = updates["upstream"];
            if (upstream != null)
                UpstreamRx.Value = upstream.Value<int>();

            var downstream = updates["downstream"];
            if (downstream != null)
                DownstreamRx.Value = downstream.Value<int>();

            var jPos = updates["placingPosition"];
            if (jPos != null)
            {
                var pos = jPos.Select(m => (float)m).ToArray();
                if (pos.Length == 3)
                    _placingPosition = new Vector3(pos[0], pos[1], pos[2]);
            }

            var jRot = updates["placingRotation"];
            if (jRot != null)
            {
                var rot = jRot.Select(m => (float)m).ToArray();
                if (rot.Length == 4)
                    _placingRotation = new Quaternion(rot[0], rot[1], rot[2], rot[3]);
            }


            var createdBy = updates["createdBy"];
            if (createdBy != null)
                CreatedByRx.Value = createdBy.Value<int>();


            var useColor = updates["useColor"];
            if (useColor != null)
                UseColorRx.Value = useColor.Value<bool>();

            var useSort = updates["useSort"];
            if (useSort != null)
                UseSortRx.Value = useSort.Value<bool>();
        }
    }
}

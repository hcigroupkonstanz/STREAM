using Assets.Modules.Core;
using Newtonsoft.Json.Linq;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Filters
{
    public class Filter : ObservableModel<Filter>
    {
        private string _uuid;
        public string Uuid
        {
            get => _uuid;
            set
            {
                if (_uuid != value)
                {
                    _uuid = value;
                    TriggerLocalChange("Uuid");
                }
            }
        }


        public readonly ReactiveProperty<string> ColorRx = new ReactiveProperty<string>();
        public string Color
        {
            get => ColorRx.Value;
            set
            {
                if (ColorRx.Value != value)
                {
                    ColorRx.Value = value;
                    TriggerLocalChange("Color");
                }
            }
        }

        private int _origin;
        public int Origin
        {
            get => _origin;
            set
            {
                if (_origin != value)
                {
                    _origin = value;
                    TriggerLocalChange("Origin");
                }
            }
        }

        public readonly ReactiveProperty<int[]> SelectedByRx = new ReactiveProperty<int[]>(new int[0]);
        public int[] SelectedBy
        {
            get => SelectedByRx.Value;
            set
            {
                if (SelectedByRx.Value != value)
                {
                    SelectedByRx.Value = value;
                    TriggerLocalChange("SelectedBy");
                }
            }
        }


        public readonly ReactiveProperty<float[][]> PathRx = new ReactiveProperty<float[][]>();
        public float[][] Path
        {
            get => PathRx.Value;
            set
            {
                PathRx.Value = value;
                TriggerLocalChange("Path");
            }
        }


        protected override void OnDestroy()
        {
            base.OnDestroy();
            ColorRx.Dispose();
            PathRx.Dispose();
            SelectedByRx.Dispose();
        }



        protected override void ApplyRemoteUpdate(JObject updates)
        {
            var uuid = updates["uuid"];
            if (uuid != null)
                _uuid = uuid.Value<string>();

            var jColor = updates["color"];
            if (jColor != null)
                ColorRx.Value = jColor.Value<string>();


            var origin = updates["origin"];
            if (origin != null)
                _origin = origin.Value<int>();

            var selectedBy = updates["selectedBy"];
            if (selectedBy != null)
                SelectedByRx.Value = selectedBy.Select(v => (int)v).ToArray() ?? new int[0];

            var jPath = updates["path"];
            if (jPath != null)
                PathRx.Value = jPath.Select(m => m.Select(n => (float)n).ToArray()).ToArray() ?? new float[0][];
        }


        public override JObject ToJson()
        {
            return new JObject
            {
                { "id", Id },
                { "uuid", _uuid },
                { "color", Color },
                { "selectedBy", new JArray(SelectedBy) },
                { "origin", _origin }
            };
        }
    }
}

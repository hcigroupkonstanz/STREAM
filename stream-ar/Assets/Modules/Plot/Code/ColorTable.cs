using Assets.Modules.Core;
using Newtonsoft.Json.Linq;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Plots
{
    public class ColorTable : ObservableModel<ColorTable>
    {
        public int[] PlotIds;
        public readonly ReactiveProperty<int[]> PlotIdsRx = new ReactiveProperty<int[]>(new int[0]);

        public Texture2D Colors;
        public readonly ReactiveProperty<Texture2D> ColorsRx = new ReactiveProperty<Texture2D>();

        public override JObject ToJson()
        {
            // not necessary
            return new JObject();
        }

        protected override void ApplyRemoteUpdate(JObject updates)
        {
            var plotIds = updates["plotIds"];
            if (plotIds != null)
            {
                PlotIds = plotIds.Select(v => (int)v).ToArray();
                PlotIdsRx.Value = PlotIds;
            }

            var jColor = updates["colors"];
            if (jColor != null)
            {
                MainThreadDispatcher.Send(_ =>
                {
                    if (Colors != null)
                        Destroy(Colors, 1f);

                    var count = Mathf.Max(jColor.Count(), 1);
                    var tex = new Texture2D(count, 1, TextureFormat.RGBAFloat, false, true)
                    {
                        filterMode = FilterMode.Point,
                        wrapMode = TextureWrapMode.Clamp
                    };

                    var i = 0;
                    tex.SetPixel(0, 0, new Color32(255, 255, 255, 255));
                    foreach (var col in jColor)
                    {
                        if (col.Count() >= 4)
                            tex.SetPixel(i, 0, new Color32(col[0].Value<byte>(), col[1].Value<byte>(), col[2].Value<byte>(), col[3].Value<byte>()));
                        i++;
                    }

                    tex.Apply();
                    Colors = tex;
                    ColorsRx.Value = tex;
                }, this);
            }
        }

        protected override void OnDestroy()
        {
            base.OnDestroy();
            if (Colors != null)
                Destroy(Colors);
            ColorsRx.Dispose();
            PlotIdsRx.Dispose();
        }
    }
}

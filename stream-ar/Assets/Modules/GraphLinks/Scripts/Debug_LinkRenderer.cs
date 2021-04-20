using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    [RequireComponent(typeof(LinkRenderer))]
    public class Debug_LinkRenderer : MonoBehaviour
    {
        public int LineCount = 1000;
        public Transform Start;
        public Transform End;
        public bool ReInitialize;

        private Texture2D _startPositions;
        private Texture2D _endPositions;
        private Texture2D _colors;

        void OnEnable()
        {
            Init();
        }

        void Update()
        {
            if (ReInitialize)
            {
                Init();
                ReInitialize = false;
            }
        }

        void OnDisable()
        {
            if (_startPositions != null)
                Destroy(_startPositions);
            _startPositions = null;

            if (_endPositions != null)
                Destroy(_endPositions);
            _endPositions = null;

            if (_colors != null)
                Destroy(_colors);
            _colors = null;
        }


        private void Init()
        {
            if (_startPositions != null)
                Destroy(_startPositions);
            _startPositions = new Texture2D(LineCount, 1, TextureFormat.RGBAFloat, false, true);
            _startPositions.filterMode = FilterMode.Point;

            if (_endPositions != null)
                Destroy(_endPositions);
            _endPositions = new Texture2D(LineCount, 1, TextureFormat.RGBAFloat, false, true);
            _endPositions.filterMode = FilterMode.Point;

            if (_colors != null)
                Destroy(_colors);
            _colors = new Texture2D(LineCount, 1, TextureFormat.RGBAFloat, false, true);
            _colors.filterMode = FilterMode.Point;


            Color[] start = new Color[LineCount];
            Color[] end = new Color[LineCount];
            Color[] colors = new Color[LineCount];
            for (int i = 0; i < LineCount; i++)
            {
                start[i] = Random.ColorHSV();
                end[i] = Random.ColorHSV();
                colors[i] = Random.ColorHSV();
            }

            _startPositions.SetPixels(start);
            _startPositions.Apply();
            _endPositions.SetPixels(end);
            _endPositions.Apply();
            _colors.SetPixels(colors);
            _colors.Apply();

            var linkRenderer = GetComponent<LinkRenderer>();
            linkRenderer.LineCount = LineCount;
            linkRenderer.StartAnchor = Start;
            linkRenderer.EndAnchor = End;
            linkRenderer.PositionStartTex = _startPositions;
            linkRenderer.PositionEndTex = _endPositions;
            linkRenderer.ColorTex = _colors;
        }
    }
}

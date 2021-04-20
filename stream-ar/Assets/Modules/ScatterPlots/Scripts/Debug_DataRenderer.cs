using UnityEngine;

namespace Assets.Modules.ScatterPlots
{
    [RequireComponent(typeof(DataRenderer))]
    public class Debug_DataRenderer : MonoBehaviour
    {
        public int DataCount = 1000;
        public bool Reinitialize;

        private Texture2D _dataPositions;
        private Texture2D _dataNull;
        private Texture2D _dataColor;

        void OnEnable()
        {
            Init();
        }

        void Update()
        {
            if (Reinitialize)
            {
                Init();
                Reinitialize = false;
            }
        }

        void OnDisable()
        {
            if (_dataPositions)
                Destroy(_dataPositions);
            _dataPositions = null;

            if (_dataNull)
                Destroy(_dataNull);
            _dataNull = null;

            if (_dataColor)
                Destroy(_dataColor);
            _dataColor = null;
        }

        private void Init()
        {
            if (_dataPositions != null)
                Destroy(_dataPositions);
            _dataPositions = new Texture2D(DataCount, 1, TextureFormat.RGFloat, false, true);
            _dataPositions.filterMode = FilterMode.Point;

            if (_dataNull != null)
                Destroy(_dataNull);
            _dataNull = new Texture2D(DataCount, 1, TextureFormat.RGFloat, false, true);
            _dataNull.filterMode = FilterMode.Point;

            if (_dataColor != null)
                Destroy(_dataColor);
            _dataColor = new Texture2D(DataCount, 1, TextureFormat.RGFloat, false, true);
            _dataColor.filterMode = FilterMode.Point;

            Color[] pos = new Color[DataCount];
            for (int i = 0; i < DataCount; i++)
                pos[i] = Random.ColorHSV();

            _dataPositions.SetPixels(pos);
            _dataPositions.Apply();

            _dataColor.SetPixels(pos);
            _dataColor.Apply();

            _dataNull.SetPixels(pos);
            _dataNull.Apply();

            var dataRenderer = GetComponent<DataRenderer>();
            dataRenderer.SetTextures(_dataPositions, _dataNull, null);
        }
    }
}

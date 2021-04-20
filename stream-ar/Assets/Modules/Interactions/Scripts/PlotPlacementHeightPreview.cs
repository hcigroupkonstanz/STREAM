using Assets.Modules.Networking;
using Cysharp.Threading.Tasks;
using System;
using System.Collections.Generic;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    public class PlotPlacementHeightPreview : MonoBehaviour
    {
        public GameObject PreviewTemplate;
        public float PreviewActiveTime = 3f;

        private readonly List<GameObject> _previewIndicators = new List<GameObject>();
        private bool _previewActive;
        private float _lastChange;
        private Transform _cam;

        private async void Awake()
        {
            _cam = Camera.main.transform;
            await WebServerConnection.Instance.Connected;

            // workaround to avoid displaying preview on startup
            await UniTask.Delay(TimeSpan.FromSeconds(5));

            StreamClient.Instance.PlacementHeightOffsetRx
                .TakeUntilDestroy(this)
                .Skip(1)
                .Subscribe(_ =>
                {
                    _lastChange = Time.time;

                    if (!_previewActive)
                    {
                        _previewActive = true;

                        // instantiate preview objects
                        for (var i = 0; i < 3; i++)
                        {
                            var indicator = Instantiate(PreviewTemplate);
                            _previewIndicators.Add(indicator);
                        }

                        UpdateIndicatorPosition();
                    }
                });
        }

        private void Update()
        {
            if (_previewActive && _lastChange + PreviewActiveTime < Time.time)
            {
                _previewActive = false;
                foreach (var indicator in _previewIndicators)
                    Destroy(indicator.gameObject);
                _previewIndicators.Clear();
            }
            else
            {
                UpdateIndicatorPosition();
            }
        }

        private void UpdateIndicatorPosition()
        {
            var placementOffset = StreamClient.Instance.PlacementHeightOffset * Vector3.up;
            for (var i = 0; i < _previewIndicators.Count; i++)
            {
                var indicator = _previewIndicators[i];
                var posOffset = 0f;
                if (i == 1) posOffset = -0.25f;
                if (i == 2) posOffset = 0.25f;
                indicator.transform.position = _cam.position + _cam.forward * (i + 1) + _cam.right * posOffset + placementOffset;
                indicator.transform.rotation = _cam.rotation;
            }
        }
    }
}

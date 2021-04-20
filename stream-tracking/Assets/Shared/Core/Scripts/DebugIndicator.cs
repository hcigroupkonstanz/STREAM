using TMPro;
using UnityEngine;
using UniRx;
using Assets.Modules.Networking;

namespace Assets.Modules.Core
{
    public class DebugIndicator : MonoBehaviour
    {
        public TextMeshPro DebugText;
        private GameObject _parent;
        private Transform _cam;
#if STREAM_AR
        public bool EnableOnCalibration = false;
        public bool EnableOnNetworkError = false;
#endif

        private void Awake()
        {
            _cam = Camera.main.transform;
#if STREAM_AR
            StreamClient.Instance.DebugIndicatorsRx
                .TakeUntilDestroy(this)
                .Subscribe(val => UpdateActive());

            if (EnableOnCalibration)
            {
                StreamClient.Instance.IsCalibratingRx
                    .TakeUntilDestroy(this)
                    .Where(v => v)
                    .Subscribe(val => UpdateActive());

                StreamClient.Instance.IsCalibratingRx
                    .TakeUntilDestroy(this)
                    .Delay(System.TimeSpan.FromSeconds(5))
                    .Subscribe(val => UpdateActive());
            }

            if (EnableOnNetworkError)
            {
                WebServerConnection.Instance.NetworkStatus
                    .TakeUntilDestroy(this)
                    .Delay(System.TimeSpan.FromSeconds(5))
                    .SubscribeOnMainThread()
                    .Subscribe(val => UpdateActive());
            }
#endif

            _parent = transform.parent?.gameObject;
            Update();
        }

#if STREAM_AR
        private void UpdateActive()
        {
            var user = StreanClient.Instance;
            var debugIndicators = user.DebugIndicators;
            var isCalibrating = EnableOnCalibration && user.IsCalibrating;
            var isNetworkError = EnableOnNetworkError && WebServerConnection.Instance.Status != ConnectionStatus.Connected && Time.time > 10f;

            gameObject.SetActive(debugIndicators || isCalibrating || isNetworkError);
        }
#endif

        private void Update()
        {
            if (DebugText)
            {
                DebugText.text = _parent.name;
                DebugText.transform.LookAt(_cam);
                DebugText.transform.Rotate(Vector3.up, 180f);
            }
        }
    }
}

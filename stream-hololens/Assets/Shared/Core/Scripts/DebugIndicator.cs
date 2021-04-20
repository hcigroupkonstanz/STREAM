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
#if MIDAIR_AR
        public bool EnableOnCalibration = false;
        public bool EnableOnNetworkError = false;
#endif

        private void Awake()
        {
            _cam = Camera.main.transform;
#if MIDAIR_AR
            ArtsClient.Instance.DebugIndicatorsRx
                .TakeUntilDestroy(this)
                .ObserveOnMainThread()
                .Subscribe(val => UpdateActive());

            if (EnableOnCalibration)
            {
                ArtsClient.Instance.IsCalibratingRx
                    .TakeUntilDestroy(this)
                    .Where(v => v)
                    .ObserveOnMainThread()
                    .Subscribe(val => UpdateActive());

                ArtsClient.Instance.IsCalibratingRx
                    .TakeUntilDestroy(this)
                    .Delay(System.TimeSpan.FromSeconds(5))
                    .ObserveOnMainThread()
                    .Subscribe(val => UpdateActive());
            }

            if (EnableOnNetworkError)
            {
                WebServerConnection.Instance.NetworkStatus
                    .TakeUntilDestroy(this)
                    .Delay(System.TimeSpan.FromSeconds(5))
                    .ObserveOnMainThread()
                    .Subscribe(val => UpdateActive());
            }
#endif

            _parent = transform.parent?.gameObject;
            Update();
        }

#if MIDAIR_AR
        private void UpdateActive()
        {
            var user = ArtsClient.Instance;
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

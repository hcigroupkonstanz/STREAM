using UniRx;
using UnityEngine;

namespace Assets.Modules.HUD
{
    public class HUDAnchor : MonoBehaviour
    {
        public float Distance = 0.6f;
        public float DistanceThreshold = 0.3f;

        private bool _isAnimating = false;
        private Transform _origin;

        private void OnEnable()
        {
            _origin = Camera.main.transform;
            transform.LookAt(_origin);
            transform.position = GetTargetPosition();
        }

        private void Update()
        {
            transform.LookAt(_origin);
            var targetPosition = GetTargetPosition();

            if (!_isAnimating && (targetPosition - transform.position).sqrMagnitude > DistanceThreshold)
            {
                var progress = 0f;
                _isAnimating = true;
                var startPosition = transform.position;
                var disposables = new CompositeDisposable();

                Observable
                    .EveryUpdate()
                    .Subscribe(_ =>
                    {
                        progress += Time.deltaTime;
                        transform.position = Vector3.Lerp(startPosition, targetPosition, progress);
                        if (progress >= 1f)
                        {
                            _isAnimating = false;
                            disposables.Clear();
                        }
                    }).AddTo(disposables);
            }
        }

        private Vector3 GetTargetPosition()
        {
            return _origin.position + _origin.rotation * Vector3.forward * Distance;
        }

        public void ToggleHUD()
        {
            var hud = transform.GetChild(0);
            var isActive = hud.gameObject.activeSelf;
            hud.gameObject.SetActive(!isActive);
        }
    }
}

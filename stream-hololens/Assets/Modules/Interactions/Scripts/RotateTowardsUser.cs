using UnityEngine;
using UniRx;
using System.Linq;
using Assets.Modules.Plots;
using Assets.Modules.GraphLinks;

namespace Assets.Modules.Interactions
{
    public class RotateTowardsUser : MonoBehaviour
    {
        private Plot _plot;
        private Link _link;
        private Transform _vis;
        private Quaternion _originalRotation;
        private readonly CompositeDisposable _disposables = new CompositeDisposable();
        private Transform _cam;

        private void Awake()
        {
            _originalRotation = transform.localRotation;
            _cam = Camera.main.transform;
        }

        private void OnEnable()
        {
            _plot = GetComponentInParent<Plot>();
            _link = GetComponentInParent<Link>();

            ReactiveProperty<bool> isUserInProxmity;

            if (_plot)
            {
                isUserInProxmity = _plot.IsUserInProximity;
                _vis = _plot.Visualization;
            }
            else
            {
                isUserInProxmity = _link.IsUserInProximity;
                _vis = _link.Visualization;
            }


            isUserInProxmity
                .TakeUntilDisable(this)
                .Subscribe(val =>
                {
                    _disposables.Clear();

                    var targetRotation = GetTargetRotation();
                    Observable
                        .EveryUpdate()
                        .TakeWhile(_ => val || transform.localRotation != _originalRotation)
                        .Subscribe(_ =>
                        {
                            if (val)
                                transform.localRotation = Quaternion.Lerp(transform.localRotation, GetTargetRotation(), 0.1f);
                            else
                                transform.localRotation = Quaternion.Lerp(transform.localRotation, _originalRotation, 0.1f);
                        })
                        .AddTo(_disposables);
                });
        }

        private void OnDisable()
        {
            _disposables.Clear();
        }


        private Quaternion GetTargetRotation()
        {
            var direction = _vis.InverseTransformDirection(_cam.position - _vis.position);
            if (direction.z < 0)
                direction = -direction;

            var newRotationY = Quaternion.LookRotation(direction, transform.up).eulerAngles.y;
            return Quaternion.Lerp(_originalRotation, Quaternion.Euler(0, newRotationY, 0), 0.5f);
        }
    }
}

using Assets.Modules.Plots;
using UniRx;
using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    public class LinkPosition : MonoBehaviour
    {
        private Link _link;
        private PlotManager _plots;
        private Collider[] _colliders;

        private Plot _start;
        private Plot _end;

        private async void OnEnable()
        {
            _colliders = GetComponentsInChildren<Collider>(true);
            _link = GetComponentInParent<Link>();
            _plots = PlotManager.Instance as PlotManager;
            await _plots.Initialized;


            // check if object was destroyed
            if (!gameObject)
                return;

            Observable.Merge(_link.UpstreamRx, _link.DownstreamRx)
                .TakeUntilDisable(this)
                .SampleFrame(1)
                .ObserveOnMainThread()
                .Subscribe(_ => RefreshAnchors());
            RefreshAnchors();

            // disable hitboxes during creation
            _link.CreatedByRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(val =>
                {
                    foreach (var collider in _colliders)
                        collider.enabled = val < 0;
                });
        }

        private void Update()
        {
            var startPos = _start ? _start.Visualization.transform.position : _link.PlacingPosition;
            var endPos = _end ? _end.Visualization.transform.position : _link.PlacingPosition;
            var distance = Mathf.Abs((startPos - endPos).magnitude);


            foreach (var collider in _colliders)
            {
                if (collider.tag == "LinkHitbox")
                {
                    Vector3 size = Vector3.zero;
                    if (_start)
                        size = _start.transform.localScale;
                    else if (_end)
                        size = _end.transform.localScale;


                    var scale = new Vector3(size.x, size.y, distance);
                    collider.transform.localScale = scale;
                }
            }

            transform.localPosition = startPos;
            transform.LookAt(endPos);
            transform.localPosition += transform.forward * distance / 2f;
        }

        private void RefreshAnchors()
        {
            _start = _plots.Get(_link.Upstream);
            _end = _plots.Get(_link.Downstream);
        }
    }
}

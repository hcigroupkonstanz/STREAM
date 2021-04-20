using Assets.Modules.Networking;
using Assets.Modules.Plots;
using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    public class LinkPlacementHelper : MonoBehaviour
    {
        public float StabilizationWeight = 0.7f;

        private Link _link;
        private ArtsClient _client;
        private Transform _cam;
        private PlotManager _plots;
        private float _placementDistance = 2f;

        private bool isFirst = true;

        private void OnEnable()
        {
            _link = GetComponentInParent<Link>();
            _client = ArtsClient.Instance;
            _cam = Camera.main.transform;
            _plots = PlotManager.Instance as PlotManager;
        }

        private void LateUpdate()
        {
            if (_link.CreatedBy == _client.Id)
            {
                if (isFirst)
                {
                    isFirst = false;
                    _link.PlacingPosition = transform.parent.InverseTransformPoint(_cam.position + _cam.forward * _placementDistance);

                    var plotUpstream = _plots.Get(_link.Upstream);
                    var plotDownstream = _plots.Get(_link.Downstream);
                    if (plotUpstream != null)
                    {
                        _link.PlacingRotation = Quaternion.identity;
                        _placementDistance = Mathf.Max(1f, Mathf.Abs((_cam.position - plotUpstream.transform.position).magnitude));
                    }
                    else if (plotDownstream != null)
                    {
                        _link.PlacingRotation = Quaternion.identity;
                        _placementDistance = Mathf.Max(1f, Mathf.Abs((_cam.position - plotDownstream.transform.position).magnitude));
                    }

                    transform.localPosition = _link.PlacingPosition;
                    transform.localRotation = _link.PlacingRotation;
                }

                var worldPos = _cam.position + _cam.forward * _placementDistance;
                var worldRot = Quaternion.identity;
                if (_client.LookingAtType == "plot"
                   && _client.LookingAtId != Mathf.Max(_link.Upstream, _link.Downstream)) // up- or downstream should be -1
                {
                    var plot = _plots.Get(_client.LookingAtId);
                    worldPos = plot.transform.position;
                    worldRot = plot.transform.rotation;
                }

                var localPos = transform.parent.InverseTransformPoint(worldPos);
                _link.PlacingPosition = Vector3.Lerp(localPos, _link.PlacingPosition, StabilizationWeight);

                var localRot = transform.parent.rotation * worldRot;
                _link.PlacingRotation = Quaternion.Lerp(localRot, _link.PlacingRotation, StabilizationWeight);
            }

            transform.localPosition = _link.PlacingPosition;
            transform.localRotation = _link.PlacingRotation;
        }
    }
}

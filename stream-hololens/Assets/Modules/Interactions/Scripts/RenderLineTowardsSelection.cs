using Assets.Modules.GraphLinks;
using Assets.Modules.Networking;
using Assets.Modules.Plots;
using Microsoft.MixedReality.Toolkit.Input;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    [RequireComponent(typeof(BezierLineRenderer))]
    public class RenderLineTowardsSelection : MonoBehaviour
    {
        private ArtsClient _client;
        private BezierLineRenderer _lines;
        private LineRenderer _lineRenderer;

        private PlotManager _plots;
        private LinkManager _links;
        private Transform _selection;
        private Transform _cam;

        // Angle within which line will not be shown (i.e. when user is looking directly at object)
        private const float FadeDeadzone = 4f;
        // Angle at which selection line has full alpha
        private const float MaxAlphaAngle = 30f;

        private const int VertexCount = 20;

        private async void OnEnable()
        {
            _cam = Camera.main.transform;
            _lines = GetComponent<BezierLineRenderer>();
            _lineRenderer = GetComponent<LineRenderer>();
            _plots = PlotManager.Instance as PlotManager;
            _links = LinkManager.Instance as LinkManager;

            await _plots.Initialized;
            await _links.Initialized;

            _client = ArtsClient.Instance;

            Observable.Merge(
                _client.SelectedTypeRx,
                _client.SelectedIdRx.Select(_ => ""))
                .BatchFrame()
                .TakeUntilDisable(this)
                .Subscribe(_ => UpdateSelection());

            var cursor = FindObjectOfType<AnimatedCursor>();
            if (cursor)
                transform.SetParent(cursor.transform, false);
        }

        private void UpdateSelection()
        {
            if (_client.SelectedType == "plot")
            {
                var plot = _plots.Get(_client.SelectedId);
                _selection = plot?.Visualization;
                _lineRenderer.material.color = plot?.Color ?? Color.white;
            }
            else if (_client.SelectedType == "link")
            {
                _selection = _links.Get(_client.SelectedId)?.Visualization;
                _lineRenderer.material.color = Color.white;
            }
            else
            {
                _selection = null;
            }

            _lineRenderer.enabled = _selection != null;
        }

        private void Update()
        {
            if (!_lineRenderer.enabled || _selection == null)
                return;

            _lines.P1 = transform.position;
            _lines.P2 = transform.position;// + transform.forward * 0.05f;
            _lines.P3 = _selection.position;


            var userLookDir = _cam.forward;
            var userSelectionDir = (_selection.transform.position - _cam.position);
            var userSelectionAngle = Vector3.Angle(userLookDir, userSelectionDir);

            var alpha = Mathf.Clamp((userSelectionAngle - FadeDeadzone) / MaxAlphaAngle, 0, 1);
            var col = _lineRenderer.material.color;
            _lineRenderer.material.color = new Color(col.r, col.g, col.b, alpha);
        }
    }
}

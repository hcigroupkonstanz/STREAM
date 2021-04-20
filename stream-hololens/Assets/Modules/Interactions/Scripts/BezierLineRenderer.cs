using System.Collections.Generic;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    [RequireComponent(typeof(LineRenderer))]
    public class BezierLineRenderer : MonoBehaviour
    {
        public Vector3 P1;
        public Vector3 P2;
        public Vector3 P3;
        private LineRenderer _lineRenderer;
        private const int VertexCount = 20;

        private void OnEnable()
        {
            _lineRenderer = GetComponent<LineRenderer>();
        }

        private void Update()
        {
            var pointList = new List<Vector3>();
            for (float ratio = 0; ratio <= 1; ratio += 1.0f / VertexCount)
            {
                var tangentLineVertex1 = Vector3.Lerp(P1, P2, ratio);
                var tangentLineVertex2 = Vector3.Lerp(P2, P3, ratio);
                var bezierpoint = Vector3.Lerp(tangentLineVertex1, tangentLineVertex2, ratio);
                pointList.Add(bezierpoint);
            }
            _lineRenderer.positionCount = pointList.Count;
            _lineRenderer.SetPositions(pointList.ToArray());
        }
    }
}
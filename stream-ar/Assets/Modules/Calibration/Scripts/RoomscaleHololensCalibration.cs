using Assets.Modules.Core;
using Assets.Modules.Networking;
using System.Linq;
using UnityEngine;
using UniRx;

namespace Assets.Modules.Calibration
{
    public class RoomscaleHololensCalibration : MonoBehaviour
    {
        public HololensCalibration Calibrator1;
        public HololensCalibration Calibrator2;

        private StreamClient _client;

        private void Awake()
        {
            _client = StreamClient.Instance;
        }

        private void Update()
        {
            if (Calibrator1.IsCalibrated && Calibrator2.IsCalibrated)
                StartCalibration();
        }

        private void StartCalibration()
        {
            var actualPosition1 = MathUtility.Average(Calibrator1.Samples.Select(s => s.Item1));
            var targetPosition1 = CalibrationOriginPoint.Instance.Point1.transform.position;

            var actualPosition2 = MathUtility.Average(Calibrator2.Samples.Select(s => s.Item1));
            var targetPosition2 = CalibrationOriginPoint.Instance.Point2.transform.position;

            var targetScale = Mathf.Abs(Vector3.Distance(targetPosition1, targetPosition2));
            var actualScale = Mathf.Abs(Vector3.Distance(actualPosition1, actualPosition2));
            //var scaleDifference = actualScale / targetScale;

            Debug.Log($"TargetScale: {targetScale}");
            Debug.Log($"ActualScale: {actualScale}");
            //Debug.Log($"Scale Difference: {scaleDifference}");


            //actualPosition1.Scale(Vector3.one * scaleDifference);
            var actualRotation1 = MathUtility.Average(Calibrator1.Samples.Select(s => s.Item2));
            var actualTRS1 = Matrix4x4.TRS(actualPosition1, actualRotation1, Vector3.one);

            //targetPosition1.Scale(Vector3.one * (1 / scaleDifference));
            var targetRotation1 = CalibrationOriginPoint.Instance.Point1.transform.rotation;
            var targetTRS1 = Matrix4x4.TRS(targetPosition1, targetRotation1, Vector3.one);

            var transformationMatrix1 = targetTRS1 * actualTRS1.inverse;


            //actualPosition2.Scale(Vector3.one * scaleDifference);
            var actualRotation2 = MathUtility.Average(Calibrator2.Samples.Select(s => s.Item2));
            var actualTRS2 = Matrix4x4.TRS(actualPosition2, actualRotation2, Vector3.one);

            //targetPosition2.Scale(Vector3.one * (1 / scaleDifference));
            var targetRotation2 = CalibrationOriginPoint.Instance.Point2.transform.rotation;
            var targetTRS2 = Matrix4x4.TRS(targetPosition2, targetRotation2, Vector3.one);

            var transformationMatrix2 = targetTRS2 * actualTRS2.inverse;


            var finalMatrix = Matrix4x4.TRS(
                MathUtility.Average(new[] { MathUtility.PositionFromMatrix(transformationMatrix1), MathUtility.PositionFromMatrix(transformationMatrix2) }),
                MathUtility.Average(new[] { MathUtility.QuaternionFromMatrix(transformationMatrix1), MathUtility.QuaternionFromMatrix(transformationMatrix2) }),
                //Vector3.one * (1 / scaleDifference));
                Vector3.one);
            //Debug.Log($"Final scale: {1 / scaleDifference}");

            var posDiff = MathUtility.PositionFromMatrix(transformationMatrix1) - MathUtility.PositionFromMatrix(transformationMatrix2);
            var rotDiff = Quaternion.Angle(MathUtility.QuaternionFromMatrix(transformationMatrix1), MathUtility.QuaternionFromMatrix(transformationMatrix2));
            Debug.Log($"actual Pos Diff: {posDiff.x}, {posDiff.y}, {posDiff.z}");
            Debug.Log($"Rot Diff: {rotDiff}");



            _client.OffsetMatrix = finalMatrix;
            _client.IsCalibrating = false;

            Calibrator1.Reset();
            Calibrator2.Reset();

        }
    }
}

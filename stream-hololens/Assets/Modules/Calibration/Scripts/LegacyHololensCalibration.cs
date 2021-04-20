using UnityEngine;
using Assets.Modules.Core;
using System.Collections.Generic;
using System;
using Assets.Modules.Networking;

namespace Assets.Modules.Calibration
{
    public class LegacyHololensCalibration : Calibrator
    {
        //private ArtsClient _client;
        //private CalibrationOriginPoint _origin;

        //private List<Vector3> _positionSamples = new List<Vector3>();
        //private List<Quaternion> _rotationSamples = new List<Quaternion>();


        //protected override void OnEnable()
        //{
        //    base.OnEnable();
        //    _client = ArtsClient.Instance;
        //    _origin = CalibrationOriginPoint.Instance;
        //}

        //private void Update()
        //{
        //    if (_client.IsCalibrating && IsTrackingActive)
        //    {
        //        CurrentSamples = _positionSamples.Count;

        //        if (_positionSamples.Count >= MaxSamples)
        //        {
        //            StartCalibration();
        //        }
        //        else
        //        {
        //            _positionSamples.Add(transform.position);
        //            _rotationSamples.Add(transform.rotation);
        //        }
        //    }
        //}


        //private void StartCalibration()
        //{
        //    var actualPosition = MathUtility.Average(_positionSamples);
        //    var actualRotation = MathUtility.Average(_rotationSamples);
        //    var actualTRS = Matrix4x4.TRS(actualPosition, actualRotation, Vector3.one);

        //    var targetPosition = _origin.Point1.transform.position;
        //    var targetRotation = _origin.Point1.transform.rotation;
        //    var targetTRS = Matrix4x4.TRS(targetPosition, targetRotation, Vector3.one);

        //    var transformationMatrix = targetTRS * actualTRS.inverse;
        //    Debug.Log($"Calibration complete with TRS:{Environment.NewLine}{transformationMatrix}");

        //    _client.OffsetMatrix = transformationMatrix;
        //    _client.IsCalibrating = false;

        //    _positionSamples.Clear();
        //    _rotationSamples.Clear();
        //    CurrentSamples = 0;
        //}




        //private void OnDrawGizmos()
        //{
        //    if (_positionSamples.Count > 0)
        //    {
        //        var positionAvg = MathUtility.Average(_positionSamples);
        //        var rotationAvg = MathUtility.Average(_rotationSamples);
        //        Gizmos.DrawCube(positionAvg, Vector3.one * 0.01f);
        //        GizmosExtension.DrawRotation(positionAvg, rotationAvg, 0.1f);
        //    }
        //}
    }
}

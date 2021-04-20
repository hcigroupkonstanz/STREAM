using Assets.Modules.Core;
using Assets.Modules.Networking;
using System;
using System.Collections.Generic;
using UnityEngine;
using UniRx;
using System.Linq;

namespace Assets.Modules.Calibration
{
    public class HololensCalibration : Calibrator
    {
        //private ArtsClient _client;

        //public readonly List<Tuple<Vector3, Quaternion>> Samples = new List<Tuple<Vector3, Quaternion>>();
        //public bool IsCalibrated;


        //private void Awake()
        //{
        //    _client = ArtsClient.Instance;
        //}

        //private void Update()
        //{
        //    if (_client.IsCalibrating && IsTrackingActive)
        //    {
        //        CurrentSamples = Samples.Count;

        //        if (CurrentSamples >= MaxSamples)
        //            IsCalibrated = true;
        //        else
        //            Samples.Add(Tuple.Create(transform.position, transform.rotation));
        //    }
        //}


        //public void Reset()
        //{
        //    Samples.Clear();
        //    CurrentSamples = 0;
        //    IsCalibrated = false;
        //}

        //private void OnDrawGizmos()
        //{
        //    if (Samples.Count > 0)
        //    {
        //        var positionAvg = MathUtility.Average(Samples.Select(t => t.Item1));
        //        var rotationAvg = MathUtility.Average(Samples.Select(t => t.Item2));
        //        Gizmos.DrawCube(positionAvg, Vector3.one * 0.01f);
        //        GizmosExtension.DrawRotation(positionAvg, rotationAvg, 0.1f);
        //    }
        //}
    }
}

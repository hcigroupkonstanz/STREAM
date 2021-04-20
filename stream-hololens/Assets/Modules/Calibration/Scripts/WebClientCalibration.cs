using Assets.Modules.Core;
using Assets.Modules.Networking;
using Assets.Modules.Tracking;
using Assets.Modules.WebClients;
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Assets.Modules.Calibration
{
    public class WebClientCalibration : Calibrator
    {
        //private WebClientManager _clientManager;
        //private TrackerManager _trackerManager;

        //private WebServerConnection _connection;

        //private readonly List<Tuple<Vector3, Quaternion>> _markerSamples = new List<Tuple<Vector3, Quaternion>>();
        //private readonly Dictionary<int, List<Tuple<Vector3, Quaternion>>> _trackerSamples = new Dictionary<int, List<Tuple<Vector3, Quaternion>>>();

        //private WebClient _calibratedClient;

        //protected override void OnEnable()
        //{
        //    base.OnEnable();
        //    MaxSamples = 50;
        //    _connection = WebServerConnection.Instance;
        //    _clientManager = WebClientManager.Instance as WebClientManager;
        //    _trackerManager = TrackerManager.Instance as TrackerManager;
        //}

        //protected override void OnDisable()
        //{
        //    base.OnDisable();
        //    ResetProgress();
        //    _calibratedClient = null;
        //}


        //private void Update()
        //{
        //    var client = _clientManager.Get().FirstOrDefault(c => c.IsCalibrating);

        //    if (_calibratedClient != client)
        //    {
        //        ResetProgress();
        //        _calibratedClient = client;

        //        // TODO: dataset must be disabled before marker can be resized
        //        //var objectTracker = Vuforia.TrackerManager.Instance.GetTracker<Vuforia.ObjectTracker>();
        //        //objectTracker.Stop();

        //        //var dataSet = objectTracker.GetActiveDataSets().First();
        //        //objectTracker.DeactivateDataSet(dataSet);

        //        var deviceWidth = client.GetDeviceSizeCm().x;
        //        var vuforiaMarker = GetComponent<Vuforia.ImageTargetBehaviour>();
        //        // vuforiaMarker.SetWidth(deviceWidth);
        //        // Debug.Log($"Setting vuforia marker size to {deviceWidth}");

        //        //objectTracker.ActivateDataSet(dataSet);
        //    }

        //    if (IsTrackingActive && client)
        //    {
        //        if (_trackerSamples.Values.Count > 0)
        //            CurrentSamples = _trackerSamples.Values.Min(l => l.Count);
        //        else
        //            CurrentSamples = 0;

        //        if (CurrentSamples >= MaxSamples)
        //            StartCalibration();
        //        else
        //        {
        //            var activeTrackers = client.Trackers
        //                .Where(id => id >= 0)
        //                .Select(id => _trackerManager.Get(id))
        //                .Where(t => t != null && t.IsActive);

        //            // only collect samples if all trackers are active
        //            if (activeTrackers.Count() != client.Trackers.Length)
        //                return;

        //            _markerSamples.Add(Tuple.Create(transform.position, transform.rotation));

        //            foreach (var tracker in activeTrackers)
        //            {
        //                if (!_trackerSamples.ContainsKey(tracker.Id))
        //                    _trackerSamples.Add(tracker.Id, new List<Tuple<Vector3, Quaternion>>());

        //                _trackerSamples[tracker.Id].Add(Tuple.Create(tracker.transform.position, tracker.transform.rotation));
        //            }
        //        }
        //    }
        //}



        //private void StartCalibration()
        //{
        //    List<Matrix4x4> offsetMatrices = new List<Matrix4x4>();

        //    var markerPosition = MathUtility.Average(_markerSamples.Select(t => t.Item1));
        //    var markerRotation = MathUtility.Average(_markerSamples.Select(t => t.Item2));
        //    var markerTRS = Matrix4x4.TRS(markerPosition, markerRotation, Vector3.one);

        //    foreach (var id in _calibratedClient.Trackers)
        //    {
        //        var trackerPosition = MathUtility.Average(_trackerSamples[id].Select(t => t.Item1));
        //        var trackerRotation = MathUtility.Average(_trackerSamples[id].Select(t => t.Item2));
        //        var trackerTRS = Matrix4x4.TRS(trackerPosition, trackerRotation, Vector3.one);

        //        var transformationMatrix = trackerTRS.inverse * markerTRS;
        //        offsetMatrices.Add(transformationMatrix);
        //        Debug.Log($"Calibration complete for tracker {id} with TRS:{Environment.NewLine}{transformationMatrix}" +
        //            $"{Environment.NewLine}{MathUtility.PositionFromMatrix(transformationMatrix)}");
        //    }

        //    _calibratedClient.OffsetMatrices = offsetMatrices.ToArray();
        //    _calibratedClient.IsCalibrating = false;
        //    _calibratedClient = null;
        //}


        //private void ResetProgress()
        //{
        //    _markerSamples.Clear();
        //    _trackerSamples.Clear();
        //    CurrentSamples = 0;
        //}
    }
}

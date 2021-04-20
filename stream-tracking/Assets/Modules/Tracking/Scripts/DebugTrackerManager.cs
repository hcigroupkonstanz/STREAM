using System.Collections.Generic;
using UnityEngine;
using UnityEngine.XR;

namespace Assets.Modules.Tracking
{
    [RequireComponent(typeof(TrackerManager))]
    public class DebugTrackerManager : MonoBehaviour
    {
        public int TrackerNum = 3;
        private List<GameObject> _debugTrackers = new List<GameObject>();
        private List<XRNodeState> _debugTrackerInfo = new List<XRNodeState>();

        private TrackerManager _manager;

        private void OnEnable()
        {
            _manager = GetComponent<TrackerManager>();

            for (int i = 0; i < TrackerNum; i++)
            {
                var tracker = new GameObject($"DebugTracker {i}");
                _debugTrackers.Add(tracker);
                tracker.transform.position = Random.insideUnitSphere;

                var trackerInfo = new XRNodeState();
                trackerInfo.uniqueID = (ulong)i;
                trackerInfo.nodeType = XRNode.HardwareTracker;
                _manager.AddNode(trackerInfo);
                _debugTrackerInfo.Add(trackerInfo);
            }
        }

        private void OnDisable()
        {
            for (int i = 0; i < _debugTrackers.Count; i++)
            {
                _manager.RemoveNode(_debugTrackerInfo[i]);
                Destroy(_debugTrackers[i]);
            }

            _debugTrackers.Clear();
            _debugTrackerInfo.Clear();
        }

        private void Update()
        {
            for (int i = 0; i < _debugTrackers.Count; i++)
            {
                var trackerInfo = _debugTrackerInfo[i];
                trackerInfo.position = _debugTrackers[i].transform.position;
                trackerInfo.rotation = _debugTrackers[i].transform.rotation;
                trackerInfo.tracked = true;
                _manager.UpdateNode(trackerInfo);
            }
        }
    }
}

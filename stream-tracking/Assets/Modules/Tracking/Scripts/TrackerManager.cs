using Assets.Modules.Networking;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.XR;

namespace Assets.Modules.Tracking
{
    public class TrackerManager : MonoBehaviour
    {
        public const float TRACKER_TIMEOUT_SECONDS = 10f;

        // change local coordinate system of vive trackers, so that button points 'up' and light points 'forward'
        private static readonly Quaternion RotationOffset = Quaternion.Euler(270, 90, 90);
        private static readonly Vector3 PositionOffset = new Vector3(0, 0.01f, 0);

        public Tracker TrackerTemplate;

        private Dictionary<string, Tracker> _activeTrackers = new Dictionary<string, Tracker>();
        private WebServerConnection _connection;

        private void OnEnable()
        {
            _connection = WebServerConnection.Instance;

            var nodes = new List<XRNodeState>();
            InputTracking.GetNodeStates(nodes);
            foreach (var node in nodes)
                AddNode(node);

            InputTracking.nodeAdded += AddNode;
            InputTracking.nodeRemoved += RemoveNode;
        }

        private void OnDisable()
        {
            InputTracking.nodeAdded -= AddNode;
            InputTracking.nodeRemoved -= RemoveNode;
        }

        private void Update()
        {
            var nodes = new List<XRNodeState>();
            InputTracking.GetNodeStates(nodes);
            foreach (var node in nodes)
                UpdateNode(node);

            // to array because _activeTrackers is modified
            foreach (var tracker in _activeTrackers.Values.ToArray())
            {
                if (Time.unscaledTime - tracker.LastUpdate > TRACKER_TIMEOUT_SECONDS)
                {
                    Debug.Log($"Timeout for tracker {tracker.HardwareId}");
                    RemoveTracker(tracker);
                }
            }
        }


        public Tracker GetTracker(string hardwareId)
        {
            if (_activeTrackers.ContainsKey(hardwareId))
                return _activeTrackers[hardwareId];
            return null;
        }

        public Tracker Get(int id)
        {
            return _activeTrackers.Values.FirstOrDefault(t => t.Id == id);
        }

        public Tracker[] GetActiveTrackers()
        {
            return _activeTrackers.Values.ToArray();
        }

        public void AddNode(XRNodeState node)
        {
            if (node.nodeType == XRNode.HardwareTracker)
            {
                var hwId = GetHardwareId(node);

                var tracker = Instantiate(TrackerTemplate);
                tracker.Id = -1;
                tracker.HardwareId = hwId;
                tracker.LastUpdate = Time.unscaledTime;
                tracker.IsActive = true;
                _activeTrackers.Add(hwId, tracker);
                Debug.Log($"Add tracker {hwId}");
            }
        }

        public void RemoveNode(XRNodeState node)
        {
            if (node.nodeType == XRNode.HardwareTracker)
            {
                var hwId = GetHardwareId(node);

                if (_activeTrackers.ContainsKey(hwId))
                {
                    var tracker = _activeTrackers[hwId];
                    RemoveTracker(tracker);
                }
                else
                {
                    Debug.LogWarning($"Already removed node {hwId}");
                }
            }
        }

        private void RemoveTracker(Tracker tracker)
        {
            _activeTrackers.Remove(tracker.HardwareId);
            if (tracker)
                Destroy(tracker.gameObject);
        }

        public void UpdateNode(XRNodeState node)
        {
            if (node.nodeType == XRNode.HardwareTracker)
            {
                var hwId = GetHardwareId(node);

                if (!_activeTrackers.ContainsKey(hwId))
                {
                    Debug.LogWarning($"No key {hwId}");
                    AddNode(node);
                    return;
                }

                var tracker = _activeTrackers[hwId];
                node.TryGetPosition(out var position);
                node.TryGetRotation(out var rotation);
                tracker.Rotation = rotation * RotationOffset;
                tracker.Position = position + tracker.Rotation * PositionOffset;

                tracker.LastUpdate = Time.unscaledTime;

                // if tracking is lost, tracker is put at (0, 0, 0)
                tracker.IsActive = (position - Vector3.zero).sqrMagnitude > Mathf.Epsilon;
            }
            else
            {
                var hwId = GetHardwareId(node);

                if (_activeTrackers.ContainsKey(hwId))
                    Debug.LogWarning($"Tracker {hwId} is classified as {node.nodeType} but in activeTrackers");
            }
        }

        private string GetHardwareId(XRNodeState node)
        {
            return node.uniqueID.ToString("X8");
        }
    }
}

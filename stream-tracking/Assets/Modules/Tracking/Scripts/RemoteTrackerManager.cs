using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Tracking
{
    [RequireComponent(typeof(TrackerManager))]
    public class RemoteTrackerManager : MonoBehaviour
    {
        private WebServerConnection _connection;
        private TrackerManager _trackerManager;

        private bool _isInitialized;

        private void OnEnable()
        {
            _connection = WebServerConnection.Instance;
            _connection.OnConnected += InitializeServer;
            _connection.OnDisconnected += UninitializeServer;
            _connection.OnMessageReceived += OnServerMessage;

            _trackerManager = GetComponent<TrackerManager>();

            Tracker.ModelCreated()
                .TakeUntilDisable(this)
                .Subscribe(t => HandleTrackerAdded(t));

            Tracker.ModelDestroyed()
                .TakeUntilDisable(this)
                .Subscribe(t => HandleTrackerRemoved(t));

            Tracker.AllLocalChanges()
                .TakeUntilDisable(this)
                .Subscribe(ev => HandleTrackerUpdated(ev.Model, ev.ChangedProperties));

            InitializeServer();
        }

        private void OnServerMessage(int channel, string command, JToken payload)
        {
            if (channel == NetworkChannel.TRACKER)
            {
                if (command == "add")
                {
                    var hwId = payload["hardwareId"].Value<string>();
                    var tracker = _trackerManager.GetActiveTrackers().FirstOrDefault(t => t.HardwareId == hwId);
                    if (tracker)
                        tracker.RemoteUpdate(payload as JObject);
                    else
                        Debug.LogWarning($"Unable to add tracker: Tracker with hwId '{hwId}' not found");
                }
                else if (command == "update")
                {
                    var id = payload["id"].Value<int>();
                    var tracker = _trackerManager.GetActiveTrackers().FirstOrDefault(t => t.Id == id);

                    if (tracker)
                        tracker.RemoteUpdate(payload as JObject);
                    else
                        Debug.LogWarning($"Unable to update tracker: No Tracker with id {id}");
                }
            }
        }

        public void SetOrigin(int num, Tracker tracker)
        {
            _connection.SendCommand(NetworkChannel.ORIGIN, $"set{num}", new JObject
            {
                { "position", new JArray(tracker.Position.x, tracker.Position.y, tracker.Position.z) },
                { "rotation", new JArray(tracker.Rotation.z, tracker.Rotation.y, tracker.Rotation.z, tracker.Rotation.w) }
            });
        }

        private void OnDisable()
        {
            _connection.OnConnected -= InitializeServer;
            _isInitialized = false;
        }


        private void InitializeServer()
        {
            if (_isInitialized)
                return;
            _isInitialized = true;

            foreach (var tracker in _trackerManager.GetActiveTrackers())
                HandleTrackerAdded(tracker);
        }

        private void UninitializeServer()
        {
            _isInitialized = false;
        }


        private void HandleTrackerAdded(Tracker tracker)
        {
            _connection.SendCommand(NetworkChannel.TRACKER, "add", tracker.ToJson(new[] { "HardwareId", "IsActive", "Position", "Rotation" }));
        }

        private void HandleTrackerRemoved(Tracker tracker)
        {
            _connection.SendCommand(NetworkChannel.TRACKER, "remove", $"{tracker.HardwareId}");
        }

        private void HandleTrackerUpdated(Tracker tracker, IList<string> changes)
        {
            IEnumerable<string> tmpChanges = changes;
            // workaround because server has not sent back ID yet
            if (tracker.Id == -1)
            {
                tmpChanges = changes.Append("HardwareId");
                Debug.Log("Using hardwareId instead of ID for updates");
            }

            _connection.SendCommand(NetworkChannel.TRACKER, "update", tracker.ToJson(tmpChanges));
        }
    }
}

using Assets.Modules.Core;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System.Linq;
using UnityEngine;
using UniRx;

namespace Assets.Modules.Calibration
{
    public class CalibrationOriginPoint : SingletonBehaviour<CalibrationOriginPoint>
    {
        public Transform Point1 { get; private set; }
        public Transform Point2 { get; private set; }

        public GameObject PointIndicatorTemplate;

        private bool _isInitialized = false;

        private void OnEnable()
        {
            var child1 = Instantiate(PointIndicatorTemplate);
            child1.transform.parent = transform;
            Point1 = child1.transform;

            var child2 = Instantiate(PointIndicatorTemplate);
            child1.transform.parent = transform;
            Point2 = child2.transform;


            var connection = WebServerConnection.Instance;
            connection.OnConnected += LoadInitialData;
            connection.OnDisconnected += OnServerDisconnected;
            LoadInitialData();

            WebServerConnection.ServerMessagesAsync
                .TakeUntilDisable(this)
                .Where(p => p.channel == NetworkChannel.ORIGIN)
                .Subscribe(p => OnServerMessage(p.channel, p.command, p.payload));
        }

        private void OnDisable()
        {
            var connection = WebServerConnection.Instance;
            connection.OnConnected -= LoadInitialData;
            connection.OnDisconnected -= OnServerDisconnected;
        }

        private async void LoadInitialData()
        {
            await WebServerConnection.Instance.Connected;
            if (_isInitialized)
                return;
            _isInitialized = true;

            WebServerConnection.Instance.SendCommand(NetworkChannel.ORIGIN, "request", null);
        }

        private void OnServerDisconnected()
        {
            _isInitialized = false;
        }

        private void OnServerMessage(int channel, string command, JToken payload)
        {
            if (command == "request")
            {
                foreach (var op in payload as JArray)
                    ApplyUpdate(op);
            }
            else if (command == "origin")
                ApplyUpdate(payload);
        }

        private void ApplyUpdate(JToken values)
        {
            var id = values["id"].Value<int>();
            Transform t;
            if (id == 1)
                t = Point1;
            else if (id == 2)
                t = Point2;
            else
            {
                Debug.LogError($"Invalid origin point with id {id}");
                return;
            }

            Vector3 position = Vector3.zero;
            var jpos = values["position"];
            if (jpos != null)
            {
                var pos = jpos.Select(m => (float)m).ToArray();
                if (pos.Length >= 3)
                    position = new Vector3(pos[0], pos[1], pos[2]);
            }

            Quaternion rotation = Quaternion.identity;
            var jrot = values["rotation"];
            if (jrot != null)
            {
                var rot = jrot.Select(m => (float)m).ToArray();
                if (rot.Length >= 4)
                    rotation = new Quaternion(rot[0], rot[1], rot[2], rot[3]);
            }

            MainThreadDispatcher.Post(_ =>
            {
                t.position = position;
                t.rotation = rotation;
            }, this);
        }


        private void OnDrawGizmos()
        {
            if (Application.isPlaying)
            {
                Gizmos.color = Color.blue;
                Gizmos.DrawWireCube(Point1.transform.position, Vector3.one * 0.01f);
                GizmosExtension.DrawRotation(Point1.transform.position, Point1.transform.rotation, 0.1f);

                Gizmos.color = Color.green;
                Gizmos.DrawWireCube(Point2.transform.position, Vector3.one * 0.01f);
                GizmosExtension.DrawRotation(Point2.transform.position, Point2.transform.rotation, 0.1f);
            }
        }
    }
}

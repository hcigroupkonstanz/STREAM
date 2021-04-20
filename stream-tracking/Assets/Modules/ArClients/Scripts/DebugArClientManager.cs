using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using UnityEngine;

namespace Assets.Modules.ArClients
{
    [RequireComponent(typeof(ArClientManager))]
    public class DebugArClientManager : MonoBehaviour
    {
        public int ClientNum = 2;

        private List<GameObject> _debugClients = new List<GameObject>();
        private ArClientManager _manager;

        private void OnEnable()
        {
            _manager = GetComponent<ArClientManager>();

            for (int i = 0; i < ClientNum; i++)
            {
                var client = new GameObject($"DebugArClient {i}");
                _debugClients.Add(client);
                _manager.AddModel(i);
            }
        }

        private void OnDisable()
        {
            for (int i = 0; i < _debugClients.Count; i++)
            {
                _manager.RemoveModel(i);
                Destroy(_debugClients[i]);
            }

            _debugClients.Clear();
        }


        private void Update()
        {
            for (int i = 0; i < _debugClients.Count; i++)
            {
                var client = _debugClients[i];
                var pos = client.transform.position;
                var rot = client.transform.rotation;

                _manager.Get(i)?.RemoteUpdate(new JObject
                {
                    { "position", new JArray(pos.x, pos.y, pos.z) },
                    { "rotation", new JArray(rot.x, rot.y, rot.z, rot.w) },
                    { "name", $"DebugName {i} {Random.value}" }
                });
            }
        }
    }
}

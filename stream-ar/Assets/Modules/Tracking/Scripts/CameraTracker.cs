using Assets.Modules.Networking;
using UnityEngine;

namespace Assets.Modules.Tracking
{
    public class CameraTracker : MonoBehaviour
    {
        private StreamClient _client;
        private Transform _cam;

        private void OnEnable()
        {
            _client = StreamClient.Instance;
            _cam = Camera.main.transform;
        }

        private void LateUpdate()
        {
            _client.Position = _cam.position;
            _client.Rotation = _cam.rotation;
        }
    }
}

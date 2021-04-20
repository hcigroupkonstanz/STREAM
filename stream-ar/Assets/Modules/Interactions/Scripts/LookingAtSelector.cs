using Assets.Modules.Networking;
using Assets.Modules.Plots;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    public class LookingAtSelector : MonoBehaviour
    {
        private StreamClient _client;
        private Transform _cam;

        private void OnEnable()
        {
            _client = StreamClient.Instance;
            _cam = Camera.main.transform;
        }

        private void Update()
        {
            var result = InteractionUtil.PerformRaycast(_cam.position, _cam.forward);
            if (result != null)
            {
                _client.LookingAtId = result.GetInteractionId();
                _client.LookingAtType = result.GetInteractionType();
            }
            else
            {
                _client.LookingAtId = -1;
                _client.LookingAtType = "";
            }
        }
    }
}

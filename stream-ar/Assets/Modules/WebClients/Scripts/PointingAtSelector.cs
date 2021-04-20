using UnityEngine;
using Assets.Modules.Interactions;
using Assets.Modules.Networking;

namespace Assets.Modules.WebClients
{
    [RequireComponent(typeof(WebClient))]
    public class PointingAtSelector : MonoBehaviour
    {
        private WebClient _client;
        private StreamClient _user;

        private void OnEnable()
        {
            _client = GetComponent<WebClient>();
            _user = StreamClient.Instance;
        }

        private void Update()
        {
            if (_client.Owner == _user.Id && _client.Orientation == WebClient.ORIENTATION_VERTICAL)
            {
                var result = InteractionUtil.PerformRaycast(transform.position, -transform.up);

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
}

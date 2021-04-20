using UnityEngine;
using UniRx;
using Assets.Modules.Networking;

namespace Assets.Modules.WebClients
{
    public class EnableCurrentOwner : MonoBehaviour
    {
        private async void Awake()
        {
            var tablet = GetComponentInParent<WebClient>();
            var user = StreamClient.Instance;
            await user.Initialized;

            tablet.ModelChange()
                .TakeUntilDestroy(this)
                .Where(changes => changes.Contains("Owner"))
                .Subscribe(_ => gameObject.SetActive(tablet.Owner == user.Id));

            gameObject.SetActive(tablet.Owner == user.Id);
        }
    }
}

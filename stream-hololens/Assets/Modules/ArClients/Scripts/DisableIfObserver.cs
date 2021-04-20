using UniRx;
using UnityEngine;

namespace Assets.Modules.ArClients
{
    public class DisableIfObserver : MonoBehaviour
    {
        private void Awake()
        {
            var arClient = GetComponentInParent<ArClient>();
            arClient.IsObserverRx
                .TakeUntilDestroy(this)
                .Subscribe(val => gameObject.SetActive(val));
        }
    }
}

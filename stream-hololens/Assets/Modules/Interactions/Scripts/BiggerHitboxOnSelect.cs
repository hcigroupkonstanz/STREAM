using Assets.Modules.Networking;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    [RequireComponent(typeof(Collider))]
    public class BiggerHitboxOnSelect : MonoBehaviour
    {
        public float SizeFactor = 1.5f;

        private void OnEnable()
        {
            var collider = GetComponent<BoxCollider>();
            var user = ArtsClient.Instance;
            var interactable = GetComponentInParent<IInteractable>();

            var originalSize = collider.size;

            Observable.Merge(user.SelectedIdRx.Select(v => ""), user.SelectedTypeRx)
                .TakeUntilDisable(this)
                .BatchFrame()
                .ObserveOnMainThread()
                .Subscribe(_ =>
                {
                    if (!user || interactable == null || !collider)
                        return;

                    if (user.SelectedId == interactable.GetInteractionId() && user.SelectedType == interactable.GetInteractionType())
                        collider.size = originalSize * SizeFactor;
                    else
                        collider.size = originalSize;
                });
        }
    }
}

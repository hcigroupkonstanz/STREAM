using UniRx;
using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    public class LinkSortIndicator : MonoBehaviour
    {
        private void Awake()
        {
            var link = GetComponentInParent<Link>();
            link.UseSortRx
                .TakeUntilDestroy(this)
                .ObserveOnMainThread()
                .Subscribe(val => gameObject.SetActive(val));
        }
    }
}

using UniRx;
using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    public class LinkColorIndicator : MonoBehaviour
    {
        public GameObject ImgEnabled;
        public GameObject ImgDisabled;

        private void Awake()
        {
            var link = GetComponentInParent<Link>();
            link.UseColorRx
                .TakeUntilDestroy(this)
                .ObserveOnMainThread()
                .Subscribe(val =>
                {
                    ImgEnabled.SetActive(val);
                    ImgDisabled.SetActive(!val);
                });
        }
    }
}

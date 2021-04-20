using UnityEngine;
using UniRx;

namespace Assets.Modules.WebClients
{
    public class WebClientSize : MonoBehaviour
    {
        public Vector2 Padding = Vector2.one * 0.015f;
        private WebClient _client;

        private void OnEnable()
        {
            _client = GetComponentInParent<WebClient>();
            _client.ModelChange()
                .TakeUntilDisable(this)
                .Where(changes => changes.Contains("Ppi") || changes.Contains("ResolutionWidth") || changes.Contains("ResolutionHeight"))
                .Subscribe(_ => UpdateSize());
            UpdateSize();
        }

        private void UpdateSize()
        {
            var size = _client.GetDeviceSizeCm() * 0.01f;
            if (!(float.IsNaN(size.x) || float.IsNaN(size.y)))
                transform.localScale = new Vector3(size.x + Padding.x, 0.01f, size.y + Padding.y);
        }
    }
}

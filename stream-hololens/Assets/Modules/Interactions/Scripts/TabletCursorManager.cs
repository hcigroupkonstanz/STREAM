using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    public class TabletCursorManager : MonoBehaviour
    {
        private WebClient _tablet;
        private ArtsClient _user;

        private void Awake()
        {
            _tablet = GetComponentInParent<WebClient>();
            _user = ArtsClient.Instance;

            _tablet.ModelChange()
                .TakeUntilDestroy(this)
                .Subscribe(_ => UpdateCursor());
            UpdateCursor();
        }

        private void UpdateCursor()
        {
            gameObject.SetActive(_tablet.Owner == _user.Id && _tablet.Orientation == "vertical");
        }
    }
}

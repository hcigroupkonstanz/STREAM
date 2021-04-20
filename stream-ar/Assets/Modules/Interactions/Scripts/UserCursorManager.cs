using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    public class UserCursorManager : MonoBehaviour
    {
        private WebClientManager _webclients;
        private CompositeDisposable _tabletDisposables = new CompositeDisposable();

        private WebClient _tablet;
        private StreamClient _user;

        private void Awake()
        {
            _user = StreamClient.Instance;
            _webclients = WebClientManager.Instance as WebClientManager;

            WebClient.AllModelChange()
                .TakeUntilDestroy(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .Subscribe(ev => SearchCurrentTablet());

            Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
                .TakeUntilDestroy(this)
                .Subscribe(m => SearchCurrentTablet());

            UpdateCursor();
        }

        private void SearchCurrentTablet()
        {
            foreach (var wc in _webclients.Get())
            {
                if (wc.Owner == _user.Id)
                {
                    if (wc != _tablet)
                    {
                        _tabletDisposables.Clear();
                        _tablet = wc;

                        _tablet.ModelChange()
                            .TakeUntilDestroy(this)
                            .Subscribe(_ => UpdateCursor());
                        UpdateCursor();
                    }
                    return;
                }
            }

            // no matching client found
            _tabletDisposables.Clear();
            _tablet = null;
            UpdateCursor();
        }

        private void UpdateCursor()
        {
            if (_tablet == null)
                gameObject.SetActive(true);
            else
            {
                if (_tablet.Orientation == "vertical" || !string.IsNullOrEmpty(_tablet.ScreenMenu.selectedMenu))
                    gameObject.SetActive(false);
                else
                    gameObject.SetActive(true);
            }
        }
    }
}

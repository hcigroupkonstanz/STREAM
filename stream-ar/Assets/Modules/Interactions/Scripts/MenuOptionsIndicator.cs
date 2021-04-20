using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using System.Linq;
using UniRx;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Modules.Interactions
{
    [RequireComponent(typeof(Image))]
    public class MenuOptionsIndicator : MonoBehaviour
    {
        private StreamClient _user;
        private WebClient _tablet;
        private WebClientManager _webclients;

        private Image _image;
        private Color _originalImageColor;

        private readonly CompositeDisposable _tabletDisposables = new CompositeDisposable();
        private readonly Color ACTIVE_COLOR = new Color(76 / 255f, 175 / 255f, 80 / 255f);

        private void OnEnable()
        {
            _user = StreamClient.Instance;
            _webclients = WebClientManager.Instance as WebClientManager;

            _image = GetComponent<Image>();
            _originalImageColor = _image.color;


            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .Subscribe(ev => SearchCurrentTablet());
        }

        private void OnDisable()
        {
            _tabletDisposables.Clear();
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

                        _tablet.ScreenMenuRx
                            .ObserveOnMainThread()
                            .Subscribe(_ => UpdateIndicator())
                            .AddTo(_tabletDisposables);

                        _tablet.ModelChange()
                            .Where(c => c.Contains("IsVoiceActive"))
                            .Subscribe(_ => UpdateIndicator())
                            .AddTo(_tabletDisposables);
                    }
                    return;
                }
            }

            // no matching client found
            _tabletDisposables.Clear();
            _tablet = null;
        }

        private void UpdateIndicator()
        {
            if (_tablet && _tablet.ScreenMenu != null && !_user.ZenMode)
            {
                var hasOptions = _tablet.ScreenMenu.options != null && _tablet.ScreenMenu.options.Length > 0;
                var hasMenuEntries = new[]
                {
                    _tablet.ScreenMenu.left,
                    _tablet.ScreenMenu.right,
                    _tablet.ScreenMenu.topleft,
                    _tablet.ScreenMenu.topright,
                    _tablet.ScreenMenu.bottomleft,
                    _tablet.ScreenMenu.bottomright,
                    _tablet.ScreenMenu.center
                }.Any(m => m != null);
                _image.enabled = !_tablet.IsVoiceActive && (hasOptions || !hasMenuEntries);

                if (!hasMenuEntries)
                    _image.color = ACTIVE_COLOR;
                else
                    _image.color = _originalImageColor;
            }
            else
            {
                _image.enabled = false;
            }
        }
    }
}

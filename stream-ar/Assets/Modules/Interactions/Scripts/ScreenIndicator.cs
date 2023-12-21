using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using Microsoft.MixedReality.Toolkit.Input;
using Newtonsoft.Json.Linq;
using UniRx;
using UnityEngine;
using static Assets.Modules.WebClients.WebClient;

namespace Assets.Modules.Interactions
{
    public class ScreenIndicator : MonoBehaviour
    {
        public RectTransform IconContainer;

        public ScreenMenuEntry TopLeft;
        public ScreenMenuEntry TopRight;
        public ScreenMenuEntry Left;
        public ScreenMenuEntry Right;
        public ScreenMenuEntry BottomLeft;
        public ScreenMenuEntry BottomRight;
        public ScreenMenuEntry Center;

        public ScreenMenuEntry[] Options;

        private StreamClient _client;
        private WebClient _webclient;
        private Transform _cam;
        private WebClientManager _webclientManager;

        //private readonly Color MainColor = new Color32(92, 107, 192, 255);
        private readonly Color MainColor = new Color32(255, 255, 255, 255);
        //private readonly Color MainColor = new Color32(66, 165, 245, 255);
        private readonly Color VoiceColor = new Color32(102, 187, 106, 255);

        private CompositeDisposable _webclientDisposables = new CompositeDisposable();

        private void OnEnable()
        {
            _cam = Camera.main.transform;
            WebServerConnection.ServerMessagesAsync
                .TakeUntilDisable(this)
                .Where(p => p.channel == NetworkChannel.CONTROL)
                .Where(p => p.command == "action")
                .ObserveOnMainThread()
                .Subscribe(p => OnUserAction(p.payload));


            _client = StreamClient.Instance;
            _webclientManager = WebClientManager.Instance as WebClientManager;

            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .Subscribe(ev => SearchCurrentWebclient());

            Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
                .TakeUntilDisable(this)
                .Subscribe(m => SearchCurrentWebclient());

            _client.ModelChange()
                .TakeUntilDisable(this)
                .Where(changes => changes.Contains("IndicatorPosition"))
                .ObserveOnMainThread()
                .Subscribe(_ => SetPosition());
            SetPosition();

            _client.ZenModeRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(_ => UpdateScreenIndicators());

            SearchCurrentWebclient();
            ClearTextIcons();
        }

        private void OnDisable()
        {
            _webclientDisposables.Clear();
        }

        private void OnUserAction(JToken data)
        {
            var direction = data["dir"].Value<string>();
            switch (direction)
            {
                case "topleft":
                    TopLeft.Activate();
                    break;
                case "topright":
                    TopRight.Activate();
                    break;
                case "bottomleft":
                    BottomLeft.Activate();
                    break;
                case "bottomright":
                    BottomRight.Activate();
                    break;
                case "left":
                    Left.Activate();
                    break;
                case "right":
                    Right.Activate();
                    break;
                case "center":
                    Center.Activate();
                    break;
                default:
                    if (_webclient?.ScreenMenu?.options != null)
                    {
                        var triggeredAction = data["action"].Value<string>();
                        for (var i = 0; i < _webclient.ScreenMenu.options.Length; i++)
                        {
                            if (_webclient.ScreenMenu.options[i].action == triggeredAction)
                            {
                                Options[i]?.Activate();
                                break;
                            }
                        }
                    }
                    break;
            }
        }

        private void SearchCurrentWebclient()
        {
            foreach (var wc in _webclientManager.Get())
            {
                if (wc.Owner == _client.Id)
                {
                    if (wc != _webclient)
                    {
                        _webclientDisposables.Clear();
                        _webclient = wc;

                        _webclient.ModelChange()
                            .Where(changes => changes.Contains("ScreenMenu") || changes.Contains("IsVoiceActive"))
                            .Subscribe(_ => UpdateScreenIndicators())
                            .AddTo(_webclientDisposables);
                        UpdateScreenIndicators();
                    }
                    return;
                }
            }

            // no matching client found
            _webclientDisposables.Clear();
            _webclient = null;
            UpdateScreenIndicators();
        }

        private void SetPosition()
        {
            var cursor = FindObjectOfType<AnimatedCursor>();
            if (cursor)
            {
                //transform.SetParent(Camera.main.transform, false);
                transform.SetParent(cursor.transform, false);
                //GetComponent<Canvas>().renderMode = RenderMode.WorldSpace;
                //transform.localScale = new Vector3(0.00125f, 0.00125f, 1);
                //transform.localPosition = new Vector3(0, 0, 0);
                transform.localRotation = Quaternion.Euler(0, 180, 0);
            }
            else
                Debug.LogError("Unable to find cursor!");

            //make sure icons are in front of objects
            transform.localPosition -= transform.forward * 0.05f;
        }

        private void UpdateScreenIndicators()
        {
            ClearTextIcons();
            if (_webclient == null || ((_client.ZenMode || _webclient.ScreenMenu.hide) && !_webclient.IsVoiceActive))
                return;

            var menu = _webclient.ScreenMenu;
            if (menu.center != null)
                Center.Text = GetMenuTitle(menu.center);
            if (menu.topleft != null)
                TopLeft.Text = GetMenuTitle(menu.topleft);
            if (menu.topright != null)
                TopRight.Text = GetMenuTitle(menu.topright);
            if (menu.bottomleft != null)
                BottomLeft.Text = GetMenuTitle(menu.bottomleft);
            if (menu.bottomright != null)
                BottomRight.Text = GetMenuTitle(menu.bottomright);
            if (menu.left != null)
                Left.Text = GetMenuTitle(menu.left);
            if (menu.right != null)
                Right.Text = GetMenuTitle(menu.right);

            if (_webclient && _webclient.IsVoiceActive)
            {
                for (var i = 0; i < Mathf.Min(Options.Length, _webclient.ScreenMenu.options.Length); i++)
                {
                    Options[i].Text = GetMenuTitle(_webclient.ScreenMenu.options[i]);
                }
            }
        }

        private string GetMenuTitle(MenuItem menu)
        {
            var prefix = "";
            if (menu.metadata["disabled"] != null && menu.metadata["disabled"].Value<bool>())
                prefix += "<color=#616161>";

            if (_webclient && _webclient.IsVoiceActive)
                return prefix + menu.voiceName;
            return prefix + menu.actionName;
        }

        private void LateUpdate()
        {
            if (_client && _client.IndicatorPosition == "cursor")
            {
                transform.LookAt(_cam.position);
                transform.Rotate(0, 180f, 0);
                transform.position = transform.parent.position - transform.forward * 0.01f;
            }
        }

        private void ClearTextIcons()
        {
            foreach (var ti in new [] { TopLeft, Left, BottomLeft, TopRight, Right, BottomRight, Center })
                ti.Text = "";

            foreach (var ti in Options)
                ti.Text = "";
        }
    }
}

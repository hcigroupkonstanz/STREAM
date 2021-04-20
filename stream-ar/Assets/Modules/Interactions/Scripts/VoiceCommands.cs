using UnityEngine;
using Assets.Modules.WebClients;
using Assets.Modules.Networking;
using UniRx;
using Assets.Modules.Plots;
using Assets.Modules.GraphLinks;
using System.Linq;
using Newtonsoft.Json.Linq;
using System;
using static Assets.Modules.WebClients.WebClient;
using Newtonsoft.Json;
using Microsoft.MixedReality.Toolkit.Input;
using Cysharp.Threading.Tasks;

namespace Assets.Modules.Interactions
{
#if UNITY_EDITOR_OSX
    public class VoiceCommands : MonoBehaviour
    {
    }

#else

    public class VoiceCommands : InputSystemGlobalListener, IMixedRealitySpeechHandler
    {
        const int RECOGNITION_SHUTDOWN_DELAY_MS = 3000;
        const int CONTEXT_DELAY_MS = 1000;

        private StreamClient _user;
        private WebClientManager _webClients;
        private PlotManager _plots;
        private LinkManager _links;
        //private KeywordRecognizer _recognizer;

        private bool _isVoiceActive = false;
        private readonly CompositeDisposable _tabletDisposables = new CompositeDisposable();
        private readonly CompositeDisposable _delayDisposables = new CompositeDisposable();

        private WebClient _currentTablet;
        private MenuItem[] _currentActions = new MenuItem[0];

        protected override async void OnEnable()
        {
            base.OnEnable();

            _user = StreamClient.Instance;
            _webClients = WebClientManager.Instance as WebClientManager;
            _plots = PlotManager.Instance as PlotManager;
            _links = LinkManager.Instance as LinkManager;

            await _user.Initialized;
            await _webClients.Initialized;
            await _plots.Initialized;
            await _links.Initialized;

            // in case object got deleted
            if (gameObject == null)
                return;


            //_speechInput = GetComponent<SpeechInputSource>();
            //InputManager.Instance.AddGlobalListener(gameObject);

            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(e => e.ChangedProperties.Contains("Owner"))
                .Subscribe(_ => UpdateTablet());
            UpdateTablet();
        }

        protected override void OnDisable()
        {
            base.OnDisable();

            _tabletDisposables.Clear();
            _delayDisposables.Clear();
            //_speechInput?.StopKeywordRecognizer();
            //InputManager.Instance?.RemoveGlobalListener(gameObject);
        }

        private void UpdateTablet()
        {
            _tabletDisposables.Clear();
            _currentTablet = _webClients.Get().FirstOrDefault(w => w.Owner == _user.Id);

            if (_currentTablet != null)
            {
                _currentTablet.ModelChange()
                    .Where(changes => changes.Contains("IsVoiceActive"))
                    .Subscribe(_ => ToggleVoice())
                    .AddTo(_tabletDisposables);
                _currentTablet.ScreenMenuRx
                    .Delay(TimeSpan.FromMilliseconds(CONTEXT_DELAY_MS))
                    .Subscribe(menu => InitVoiceCommands(menu))
                    .AddTo(_tabletDisposables);
            }
            else
            {
                _currentActions = new MenuItem[0];
            }

            ToggleVoice();
        }


        private void InitVoiceCommands(Menu menu)
        {
            _currentActions = new[]
            {
                menu.topleft,
                menu.topright,
                menu.left,
                menu.center,
                menu.right,
                menu.bottomleft,
                menu.bottomright
            }
                .Concat(menu.options)
                .Where(m => m != null && !string.IsNullOrEmpty(m.voice))
                .ToArray();

            if (_currentActions.Length > 0)
            {
                Debug.Log("Available Voice commands: " + string.Join(", ", _currentActions
                    .Where(m => m != null && !string.IsNullOrEmpty(m.voice))
                    .Select(m => m.voice)));
            }
        }


        private void ToggleVoice()
        {
            _delayDisposables.Clear();

            if (_currentTablet && _currentTablet.IsVoiceActive)
            {
                Debug.Log($"Turning on voice recognition");
                //_speechInput.StartKeywordRecognizer();
                _isVoiceActive = true;
            }
            else
            {
                UniTask.Delay(RECOGNITION_SHUTDOWN_DELAY_MS)
                    .ToObservable()
                    .Subscribe(_ =>
                    {
                        Debug.Log($"Stopping voice recognition");
                        //_speechInput.StopKeywordRecognizer();
                        _isVoiceActive = false;
                    })
                    .AddTo(_delayDisposables);
            }
        }

        public void OnSpeechKeywordRecognized(SpeechEventData eventData)
        {
            if (_isVoiceActive)
            {
                Debug.Log($"Detected voice command: {eventData.Command.Keyword}");

                if (_currentTablet != null)
                {
                    var selectedAction = _currentActions.FirstOrDefault(item => item.voice == eventData.Command.Keyword);

                    if (selectedAction != null)
                        WebServerConnection.Instance.SendCommand(NetworkChannel.VOICE, "cmd", JToken.FromObject(selectedAction));
                }
            }
        }
    }
#endif
}

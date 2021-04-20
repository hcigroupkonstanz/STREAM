using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System;
using UniRx;
using UnityEngine;
using UnityEngine.UI;

namespace Assets.Modules.Interactions
{
    [RequireComponent(typeof(Image))]
    public class SelectionProgressBar : MonoBehaviour
    {
        private Image _img;
        private readonly CompositeDisposable _animationDisposable = new CompositeDisposable();

        private void OnEnable()
        {
            var user = ArtsClient.Instance;
            _img = GetComponent<Image>();
            _img.fillAmount = 0;

            user.SelectionProgressRx
                .TakeUntilDisable(this)
                .Where(v => v > Mathf.Epsilon)
                .ObserveOnMainThread()
                .Subscribe(v => UpdateFillAmount(v / 100f));

            WebServerConnection.ServerMessagesAsync
                .TakeUntilDisable(this)
                .Where(p => p.channel == NetworkChannel.CONTROL)
                .Where(p => p.command == "action")
                .Subscribe(p => OnUserAction(p.payload));
        }

        private void OnDisable()
        {
            _animationDisposable.Clear();
        }

        private void OnUserAction(JToken data)
        {
            var action = data["action"];
            if (action != null && action.Value<string>() == "select")
                ArtsClient.Instance.SelectionProgress = 100;
        }


        private void UpdateFillAmount(float progress)
        {
            _animationDisposable.Clear();
            _img.fillAmount = progress;
            _img.color = Color.white;

            Observable.Timer(TimeSpan.FromMilliseconds(75))
                .Subscribe(_ =>
                {
                    if (_img.fillAmount < 1)
                        ClearFill();
                    else
                        FadeOut();
                })
                .AddTo(_animationDisposable);
        }

        private void ClearFill()
        {
            var startTime = Time.time;
            var startFill = _img.fillAmount;

            _img.color = new Color(244 / 255f, 67 / 255f, 54 / 255f, 1f);

            Observable.EveryUpdate()
                .TakeWhile(_ => _img.fillAmount > 0)
                .Subscribe(_ => _img.fillAmount = startFill - (Time.time - startTime) * 0.5f)
                .AddTo(_animationDisposable);
        }

        private void FadeOut()
        {
            var startTime = Time.time;
            Observable.EveryUpdate()
                .TakeWhile(_ => _img.color.a > 0.01)
                .Subscribe(_ => _img.color = new Color(76 / 255f, 175 / 255f, 80 / 255f, 1 - (Time.time - startTime) * 1f))
                .AddTo(_animationDisposable);
        }
    }
}

using TMPro;
using UnityEngine;
using UnityEngine.UI;
using UniRx;

namespace Assets.Modules.Interactions
{
    [DefaultExecutionOrder(-100)]
    public class ScreenMenuEntry : MonoBehaviour
    {
        public Image Line;
        public Image Background;
        public TextMeshProUGUI RendererText;

        private string _currentText;
        public string Text
        {
            set
            {
                var text = value ?? "";

                if (_isAnimating)
                {
                    if (text == RendererText.text)
                        Show();

                    _textAfterAnimation = text;
                    if (string.IsNullOrEmpty(_textAfterAnimation))
                        Hide();
                }
                else
                {
                    RendererText.text = text;
                    if (!string.IsNullOrEmpty(text))
                        Show();
                    else
                        Hide();
                }
            }
        }

        private readonly CompositeDisposable _animationDisposables = new CompositeDisposable();
        private bool _isAnimating = false;
        private bool _hideAfterAnimation = false;
        private string _textAfterAnimation = null;

        private float _startLineOpacity;
        private Color _startLineColor;
        private float _startBackgroundOpacity;
        private Color _startBackgroundColor;
        private float _startTextOpacity;
        private Color _startTextColor;

        private void Awake()
        {
            _startLineOpacity = Line.color.a;
            _startBackgroundOpacity = Background.color.a;
            _startTextOpacity = RendererText.color.a;

            _startTextColor = RendererText.color;
            _startLineColor = Line.color;
            _startBackgroundColor = Background.color;
        }

        private void OnDisable()
        {
            StopAnimation();
        }


        public void Show()
        {
            _hideAfterAnimation = false;
            gameObject.SetActive(true);
        }

        public void Hide()
        {
            if (_isAnimating)
                _hideAfterAnimation = true;
            else
            {
                RendererText.color = _startTextColor;
                Line.color = _startLineColor;
                Background.color = _startBackgroundColor;
                gameObject.SetActive(false);
            }
        }

        public void Activate()
        {
            if (!gameObject.activeSelf)
                return;

            if (_isAnimating)
                StopAnimation();

            _isAnimating = true;
            var startTime = Time.time;
            float progress = 0f;

            Color highlightColor = new Color(76 / 255f, 175 / 255f, 80 / 255f);
            Background.color = highlightColor;
            Line.color = highlightColor;

            Observable.EveryUpdate()
                .TakeWhile(_ => progress < 1)
                .Subscribe(_ =>
                {
                    progress = (Time.time - startTime);

                    if (_hideAfterAnimation)
                    {
                        RendererText.color = new Color(RendererText.color.r, RendererText.color.g, RendererText.color.b, 1 - progress);
                        Line.color = new Color(highlightColor.r, highlightColor.g, highlightColor.b, 1 - progress);
                        Background.color = new Color(highlightColor.r, highlightColor.g, highlightColor.b, 1 - progress);
                    }
                    else
                    {
                        Line.color = Color.Lerp(highlightColor, _startLineColor, progress);
                        Background.color = Color.Lerp(highlightColor, _startBackgroundColor, progress);
                    }

                    if (progress >= 1)
                        StopAnimation();
                })
                .AddTo(_animationDisposables);
        }

        private void StopAnimation()
        {
            _isAnimating = false;
            _animationDisposables.Clear();

            if (_textAfterAnimation != null)
            {
                Text = _textAfterAnimation;
                _textAfterAnimation = null;
            }

            if (_hideAfterAnimation)
            {
                _hideAfterAnimation = false;
                Hide();
            }


            RendererText.color = _startTextColor;
            Line.color = _startLineColor;
            Background.color = _startBackgroundColor;
        }
    }
}

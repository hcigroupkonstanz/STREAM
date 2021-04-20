using UnityEngine;
using System.Collections;
using Assets.Modules.ScatterPlots;
using UniRx;

namespace Assets.Modules.Plots
{
    [RequireComponent(typeof(ColorTable))]
    public class ColorTableAnimation : MonoBehaviour
    {
        public ComputeShader TransitionShaderTemplate;

        private PlotManager _plots;
        private ComputeShader _transitionColorShader;
        private readonly CompositeDisposable _animationDisposables = new CompositeDisposable();
        private RenderTexture _colorTexture;
        private Texture _tmpTexture;
        private ColorTable _colorTable;

        private void OnEnable()
        {
            _colorTable = GetComponent<ColorTable>();
            _transitionColorShader = Instantiate(TransitionShaderTemplate);
            _plots = PlotManager.Instance as PlotManager;

            _colorTable.ColorsRx
                .TakeUntilDisable(this)
                .Where(val => val != null)
                .ObserveOnMainThread()
                .Subscribe(val => UpdateColor(val));

            _colorTable.PlotIdsRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(val => AssignTexture());
        }

        private void OnDisable()
        {
            _animationDisposables.Clear();
        }

        private void ReleaseTexture()
        {
            if (_colorTexture)
            {
                _colorTexture.Release();
                Destroy(_colorTexture, 1f);
                _colorTexture = null;
            }
        }


        public void UpdateColor(Texture2D col)
        {
            if (!col)
                return;

            var hasSizeChanged = _colorTexture == null || _colorTexture.width != col.width;

            #if STREAM_OBSERVER
            hasSizeChanged = true;
            #endif

            if (hasSizeChanged)
            {
                if (_colorTexture != null)
                {
                    _colorTexture.Release();
                    Destroy(_colorTexture, 1f);
                }

                _colorTexture = CreateRenderTexture(col.width, col.height);
                AssignTexture();
                SetRenderTexture(col);
            }
            else
            {
                AnimateTexture(col);
            }
        }


        private RenderTexture CreateRenderTexture(int width, int height)
        {
            var texDesc = new RenderTextureDescriptor(1, 1, RenderTextureFormat.ARGBFloat, 0);
            texDesc.sRGB = false;
            texDesc.enableRandomWrite = true;
            texDesc.width = width;
            texDesc.height = height;

            var tex = new RenderTexture(texDesc);
            tex.filterMode = FilterMode.Point;
            tex.wrapMode = TextureWrapMode.Clamp;

            tex.Create();
            return tex;
        }

        private void AssignTexture()
        {
            foreach (var plotId in _colorTable.PlotIds)
            {
                var plot = _plots.Get(plotId);
                if (plot)
                    plot.GetComponentInChildren<ScatterPlot>().ColorTexture = _colorTexture;
                else
                    Debug.LogWarning("Unable to find plot");
            }

        }



        private void SetRenderTexture(Texture2D source)
        {
            // use custom applyTexture instead of Graphics.Blit because
            // the latter won't work reliably on hololens...
            #if STREAM_OBSERVER
            Graphics.Blit(source, _colorTexture);
            #else

            var kernelHandle = _transitionColorShader.FindKernel("ApplyTexture");
            _transitionColorShader.SetInt("InputSize", source.width);
            _transitionColorShader.SetTexture(kernelHandle, "Input", source);
            _transitionColorShader.SetTexture(kernelHandle, "Result", _colorTexture);
            _transitionColorShader.Dispatch(kernelHandle, source.width, 1, 1);
            #endif
        }

        private void AnimateTexture(Texture2D endTex)
        {
            var startTex = CreateTexture2D(_colorTexture.width, _colorTexture.height);
            var prevRT = RenderTexture.active;
            RenderTexture.active = _colorTexture;
            startTex.ReadPixels(new Rect(0, 0, startTex.width, startTex.height), 0, 0, false);
            startTex.Apply();
            RenderTexture.active = prevRT;

            var kernelHandle = _transitionColorShader.FindKernel("TransitionTexture");
            _transitionColorShader.SetTexture(kernelHandle, "Start", startTex);
            _transitionColorShader.SetInt("InputSize", _colorTexture.width);
            _transitionColorShader.SetTexture(kernelHandle, "Target", endTex);
            _transitionColorShader.SetTexture(kernelHandle, "Result", _colorTexture);

            var animationStart = Time.time;
            var animationProgress = 0f;

            Observable.EveryUpdate()
                .TakeWhile(_ => animationProgress < 1)
                .Subscribe(_ =>
                {
                    animationProgress = Mathf.Min((Time.time - animationStart) * 2f, 1);

                    _transitionColorShader.SetFloat("AnimationProgress", animationProgress);
                    _transitionColorShader.Dispatch(kernelHandle, _colorTexture.width, 1, 1);
                })
                .AddTo(_animationDisposables);
        }

        private Texture2D CreateTexture2D(int width, int height)
        {
            if (width == 0)
            {
                var tex = new Texture2D(1, 1, TextureFormat.RGBAFloat, false, true);
                tex.SetPixel(0, 0, new Color(0, 0, 0, 0));
                tex.Apply();
                return tex;
            }
            else
            {
                var tex = new Texture2D(width, height, TextureFormat.RGBAFloat, false, true)
                {
                    filterMode = FilterMode.Point,
                    wrapMode = TextureWrapMode.Clamp
                };

                tex.Apply();
                return tex;
            }
        }

    }
}

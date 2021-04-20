using Assets.Modules.Plots;
using System;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.ScatterPlots
{
    public class ScatterPlot : MonoBehaviour
    {
        public DataRenderer Renderer;
        public ComputeShader TransitionShaderTemplate;

        public RenderTexture PositionTexture { get; private set; }
        public RenderTexture NullTexture { get; private set; }
        public RenderTexture DataIndicesTexture;

        private RenderTexture _colorTexture;
        public RenderTexture ColorTexture
        {
            get => _colorTexture;
            set
            {
                _colorTexture = value;
                Renderer.SetColorTexture(value);
                UpdateIndices();
            }
        }

        private Plot _plot;
        private readonly CompositeDisposable _animationDisposables = new CompositeDisposable();
        private readonly List<Texture> _tempTextures = new List<Texture>();

        private ComputeShader _transitionPositionShader;
        private ComputeShader _transitionNullShader;
        private ComputeShader _transitionIndicesShader;

        private RenderTextureDescriptor _texDesc;

        private void OnEnable()
        {
            _plot = GetComponentInParent<Plot>();
            if (_plot)
            {
                Initialize();
            }
            else
            {
                Debug.LogError("Unable to find matching plot");
                enabled = false;
            }
        }

        private void OnDisable()
        {
            ReleaseTextures();
            _animationDisposables.Clear();

            Destroy(_transitionIndicesShader);
            Destroy(_transitionNullShader);
            Destroy(_transitionIndicesShader);
        }

        private RenderTexture CreateRenderTexture()
        {
            var tex = new RenderTexture(_texDesc);
            tex.filterMode = FilterMode.Point;
            tex.wrapMode = TextureWrapMode.Clamp;

            tex.Create();
            return tex;
        }

        private void ReleaseTextures()
        {
            if (PositionTexture)
            {
                PositionTexture.Release();
                Destroy(PositionTexture, 1f);
                PositionTexture = null;
            }

            if (NullTexture)
            {
                NullTexture.Release();
                Destroy(NullTexture, 1f);
                NullTexture = null;
            }

            if (DataIndicesTexture)
            {
                DataIndicesTexture.Release();
                Destroy(DataIndicesTexture, 1f);
                DataIndicesTexture = null;
            }
        }


        private void Initialize()
        {
            _transitionPositionShader = Instantiate(TransitionShaderTemplate);
            _transitionNullShader = Instantiate(TransitionShaderTemplate);
            _transitionIndicesShader = Instantiate(TransitionShaderTemplate);

            _texDesc = new RenderTextureDescriptor(1, 1, RenderTextureFormat.ARGBFloat, 0);
            _texDesc.sRGB = false;
            _texDesc.enableRandomWrite = true;

            InitTexture();

            _plot.DataRx
                .ObserveOnMainThread()
                .TakeUntilDisable(this)
                .Subscribe(_ => OnDataChange());
        }

        
        private void UpdateIndices()
        {
            if (_colorTexture)
            {
                var targetIndicesTexture = CreateTexture2D(i => new Color(((float)_plot.Data[i].Id) / (_colorTexture.width - 1), 0, 0, 1));
                SetRenderTexture(targetIndicesTexture, DataIndicesTexture, _transitionIndicesShader);
                Destroy(targetIndicesTexture);
            }
        }


        private void OnDataChange()
        {
            _animationDisposables.Clear();
            ClearTempTextures();

            var width = Mathf.Max(1, _plot.Data.Length);
            // bool hasSizeChanged = false;
            if (_texDesc.width != width)
            {
                _texDesc.width = width;
                InitTexture();
                // hasSizeChanged = true;
            }

            UpdateIndices();

            var targetPosTexture = CreateTexture2D(i => new Color(_plot.Data[i].X, _plot.Data[i].Y, 0, 1));
            var targetNullTexture = CreateTexture2D(i => new Color(_plot.Data[i].IsXNull ? 1 : 0, _plot.Data[i].IsYNull ? 1 : 0, 0, 1));

            // if (hasSizeChanged)
            // {
                SetRenderTexture(targetPosTexture, PositionTexture, _transitionPositionShader);
                SetRenderTexture(targetNullTexture, NullTexture, _transitionNullShader);

                Destroy(targetPosTexture);
                Destroy(targetNullTexture);
            // }
            // else if (_plot.Data.Length != 0)
            // {
            //     AnimateTexture(targetPosTexture, PositionTexture, _transitionPositionShader);
            //     AnimateTexture(targetNullTexture, NullTexture, _transitionNullShader);
            // }
        }


        private void InitTexture()
        {
            ReleaseTextures();

            PositionTexture = CreateRenderTexture();
            NullTexture = CreateRenderTexture();
            DataIndicesTexture = CreateRenderTexture();

            Renderer.SetTextures(PositionTexture, NullTexture, DataIndicesTexture);
        }


        private Texture2D CreateTexture2D(Func<int, Color> fill = null)
        {
            var count = _plot.Data.Length;

            if (count == 0)
            {
                var tex = new Texture2D(1, 1, TextureFormat.RGBAFloat, false, true);
                tex.SetPixel(0, 0, new Color(0, 0, 0, 0));
                tex.Apply();
                return tex;
            }
            else
            {
                var tex = new Texture2D(count, 1, TextureFormat.RGBAFloat, false, true)
                {
                    filterMode = FilterMode.Point,
                    wrapMode = TextureWrapMode.Clamp
                };

                if (fill != null)
                {
                    Color[] pos = new Color[count];
                    for (int i = 0; i < count; i++)
                        pos[i] = fill(i);

                    tex.SetPixels(pos);
                }

                tex.Apply();
                return tex;
            }
        }


        private void SetRenderTexture(Texture2D source, RenderTexture target, ComputeShader shader)
        {
            // use custom applyTexture instead of Graphics.Blit because
            // the latter won't work reliably on hololens...
            #if STREAM_OBSERVER
            Graphics.Blit(source, target);
            #else

            var kernelHandle = shader.FindKernel("ApplyTexture");
            shader.SetInt("InputSize", source.width);
            shader.SetTexture(kernelHandle, "Input", source);
            shader.SetTexture(kernelHandle, "Result", target);
            shader.Dispatch(kernelHandle, source.width, 1, 1);
            #endif
        }

#if !STREAM_OBSERVER
        private void AnimateTexture(Texture2D endTex, RenderTexture resultTex, ComputeShader shader, bool cleanupEndTexture = true)
        {
            var startTex = CreateTexture2D();
            var prevRT = RenderTexture.active;
            RenderTexture.active = resultTex;
            startTex.ReadPixels(new Rect(0, 0, startTex.width, startTex.height), 0, 0, false);
            startTex.Apply();
            RenderTexture.active = prevRT;

            var kernelHandle = shader.FindKernel("TransitionTexture");
            shader.SetTexture(kernelHandle, "Start", startTex);
            shader.SetInt("InputSize", resultTex.width);
            shader.SetTexture(kernelHandle, "Target", endTex);
            shader.SetTexture(kernelHandle, "Result", resultTex);

            _tempTextures.Add(startTex);
            if (cleanupEndTexture)
                _tempTextures.Add(endTex);

            var animationStart = Time.time;
            var animationProgress = 0f;

            Observable.EveryUpdate()
                .TakeWhile(_ => animationProgress < 1)
                .Subscribe(_ =>
                {
                    animationProgress = Mathf.Min((Time.time - animationStart) * 2f, 1);

                    shader.SetFloat("AnimationProgress", animationProgress);
                    shader.Dispatch(kernelHandle, resultTex.width, 1, 1);
                },
                () => ClearTempTextures())
                .AddTo(_animationDisposables);
        }
#endif

        private void ClearTempTextures()
        {
            foreach (var tex in _tempTextures)
                Destroy(tex, 1f);
            _tempTextures.Clear();
        }
    }
}

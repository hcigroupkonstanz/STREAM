using UnityEngine;
using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using System.Linq;
using UniRx;

namespace Assets.Modules.Plots
{
    [RequireComponent(typeof(Animator))]
    public class PlotSelectionOutline : MonoBehaviour
    {
        public ParticleSystem SelectionParticles;

        private ArtsClient _user;
        private WebClient _tablet;
        private WebClientManager _webclientManager;
        private Plot _plot;
        private Animator _animator;

        private CompositeDisposable _webclientDisposables = new CompositeDisposable();

        private void Awake()
        {
            _user = ArtsClient.Instance;
            _webclientManager = WebClientManager.Instance as WebClientManager;
            _plot = GetComponentInParent<Plot>();

            var mainParticles = SelectionParticles.main;
            _plot.ColorRx
                .TakeUntilDestroy(this)
                .ObserveOnMainThread()
                .Subscribe(col => mainParticles.startColor = col);
            _animator = GetComponent<Animator>();

            Observable.Merge(
                _user.SelectedIdRx,
                _user.SelectedTypeRx.Select(v => 0),
                _user.ZenModeRx.Select(v => 0),
                _user.LookingAtIdRx,
                _user.LookingAtTypeRx.Select(v => 0)
            )
                .BatchFrame()
                .TakeUntilDestroy(this)
                .ObserveOnMainThread()
                .Subscribe(_ => UpdateOutline());


            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .Subscribe(ev => SearchCurrentWebclient());

            Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
                .TakeUntilDisable(this)
                .Subscribe(m => SearchCurrentWebclient());
            SearchCurrentWebclient();
        }

        private void OnDestroy()
        {
            _webclientDisposables.Clear();
        }


        private void SearchCurrentWebclient()
        {
            foreach (var wc in _webclientManager.Get())
            {
                if (wc.Owner == _user.Id)
                {
                    if (wc != _tablet)
                    {
                        _webclientDisposables.Clear();
                        _tablet = wc;

                        _tablet.ModelChange()
                            .Where(changes => changes.Contains("LookingAtId") || changes.Contains("LookingAtType"))
                            .Subscribe(_ => UpdateOutline())
                            .AddTo(_webclientDisposables);
                        UpdateOutline();
                    }
                    return;
                }
            }

            // no matching client found
            _webclientDisposables.Clear();
            _tablet = null;
            UpdateOutline();
        }


        private void UpdateOutline()
        {
            if (_user.ZenMode)
            {
                gameObject.SetActive(false);
                return;
            }

            var particleEmission = SelectionParticles.emission;

            if (_user.SelectedType == "plot" && _user.SelectedId == _plot.Id)
            {
                gameObject.SetActive(true);
                _animator.speed = 1.2f;
                particleEmission.rateOverTime = 100;
            }
            else
            {
                var isTabletLooking = _tablet && _tablet.Orientation == WebClient.ORIENTATION_VERTICAL
                    && _tablet.LookingAtType == "plot" && _tablet.LookingAtId == _plot.Id;
                var isUserLooking = _user.LookingAtType == "plot" && _user.LookingAtId == _plot.Id;

                if (isTabletLooking || isUserLooking)
                {
                    if (gameObject)
                        gameObject.SetActive(true);
                    _animator.speed = 0.25f;
                    particleEmission.rateOverTime = 10;
                }
                else
                {
                    gameObject.SetActive(false);
                }
            }
        }
    }
}

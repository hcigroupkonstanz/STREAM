using UnityEngine;
using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using System.Linq;
using UniRx;

namespace Assets.Modules.GraphLinks
{
    [RequireComponent(typeof(Animator))]
    public class LinkSelectionOutline : MonoBehaviour
    {
        public ParticleSystem SelectionParticles;

        private StreamClient _user;
        private WebClient _tablet;
        private WebClientManager _webclientManager;
        private Link _link;
        private Animator _animator;

        private CompositeDisposable _webclientDisposables = new CompositeDisposable();
        private bool _isDestroyed = false;

        private void Awake()
        {
            _user = StreamClient.Instance;
            _webclientManager = WebClientManager.Instance as WebClientManager;
            _link = GetComponentInParent<Link>();
            _animator = GetComponent<Animator>();

            Observable.Merge(
                _user.SelectedIdRx,
                _user.SelectedTypeRx.Select(v => 0),
                _user.ZenModeRx.Select(v => 0),
                _user.LookingAtIdRx,
                _user.LookingAtTypeRx.Select(v => 0)
            )
                .TakeUntilDestroy(this)
                .BatchFrame()
                .ObserveOnMainThread()
                .Subscribe(_ => UpdateOutline());


            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .ObserveOnMainThread()
                .Subscribe(ev => SearchCurrentWebclient());

            Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
                .TakeUntilDisable(this)
                .Subscribe(m => SearchCurrentWebclient());
            SearchCurrentWebclient();
        }

        private void OnDestroy()
        {
            _isDestroyed = true;
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
            // check if game object has been destroyed
            if (!gameObject || _isDestroyed)
            {
                return;
            }

            if (_user.ZenMode)
            {
                gameObject.SetActive(false);
                return;
            }

            var particleEmission = SelectionParticles.emission;

            if (_user.SelectedType == "link" && _user.SelectedId == _link.Id)
            {
                gameObject.SetActive(true);
                _animator.speed = 1.2f;
                particleEmission.rateOverTime = 100;
            }
            else
            {
                var isTabletLooking = _tablet && _tablet.Orientation == WebClient.ORIENTATION_VERTICAL
                    && _tablet.LookingAtType == "link" && _tablet.LookingAtId == _link.Id;
                var isUserLooking = _user.LookingAtType == "link" && _user.LookingAtId == _link.Id;

                if (isTabletLooking || isUserLooking)
                {
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

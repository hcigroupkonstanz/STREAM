using UnityEngine;
using UniRx;
using System.Linq;
using Assets.Modules.Networking;
using Assets.Modules.WebClients;

namespace Assets.Modules.GraphLinks
{
    public class ReduceLinkTransparency : MonoBehaviour
    {
        public Collider[] DisableColliders;
        public GameObject[] DisableOthers;
        public LinkRenderer LinkRenderer;

        private readonly CompositeDisposable _animationDisposables = new CompositeDisposable();
        private Link _link;
        private StreamClient _user;

        private WebClientManager _webclientManager;
        private WebClient _tablet;
        private readonly CompositeDisposable _tabletDisposables = new CompositeDisposable();

        private const float ANIMATION_WEIGHT = 0.075f;

        private bool _isUserCreatingLine = false;
        private bool _isUserStandingInLine = false;

        private void OnEnable()
        {
            _link = GetComponentInParent<Link>();

            var links = LinkManager.Instance;
            _user = StreamClient.Instance;



            _webclientManager = WebClientManager.Instance as WebClientManager;

            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .Subscribe(ev => SearchCurrentWebclient());

            Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
                .TakeUntilDisable(this)
                .Subscribe(m => SearchCurrentWebclient());
            SearchCurrentWebclient();


            Observable.Merge(
                Link.AllModelChange().Where(ev => ev.ChangedProperties.Contains("CreatedBy")).Select(ev => ev.Model),
                Link.ModelDestroyed()
            )
                .TakeUntilDisable(this)
                .Subscribe(_ =>
                {
                    _isUserCreatingLine = links.Get().Any(l => l.CreatedBy == _user.Id);
                    // workaround because hololens thinks user is standing in line??
                    _isUserStandingInLine = false;
                    UpdateTransparency();
                });
        }

        private void OnDisable()
        {
            _animationDisposables.Clear();
            _tabletDisposables.Clear();
        }


        private void SearchCurrentWebclient()
        {
            foreach (var wc in _webclientManager.Get())
            {
                if (wc.Owner == _user.Id)
                {
                    if (wc != _tablet)
                    {
                        _tabletDisposables.Clear();
                        _tablet = wc;

                        _tablet.ModelChange()
                            .Where(changes => changes.Contains("Orientation")
                                || changes.Contains("SelectedId")
                                || changes.Contains("SelectedType"))
                            .Subscribe(_ => UpdateTransparency())
                            .AddTo(_tabletDisposables);
                        UpdateTransparency();
                    }
                    return;
                }
            }

            // no matching client found
            _tabletDisposables.Clear();
            _tablet = null;
            UpdateTransparency();
        }


        private void UpdateTransparency()
        {
            var targetTransparency = 1f;
            if (_isUserCreatingLine && _link.CreatedBy != _user.Id)
                targetTransparency = 0.6f;

            var isTabletVertical = _tablet && _tablet.Orientation == WebClient.ORIENTATION_VERTICAL;
            var isPlotSelected = _user.SelectedType == "plot"
                && (_user.SelectedId == _link.Upstream || _user.SelectedId == _link.Downstream);
            if (isTabletVertical && isPlotSelected)
                targetTransparency = 0.6f;

            if (_isUserStandingInLine)
                targetTransparency = 0f;

            // line should always be visible if user is creating the line
            if (_link.CreatedBy == _user.Id)
                targetTransparency = 1f;

            _animationDisposables.Clear();
            Observable.EveryUpdate()
                .TakeWhile(_ => LinkRenderer.Transparency != targetTransparency)
                .Subscribe(_ => {
                    LinkRenderer.Transparency = Mathf.Lerp(LinkRenderer.Transparency, targetTransparency, ANIMATION_WEIGHT);
                    if (Mathf.Abs(LinkRenderer.Transparency - targetTransparency) < 0.01f)
                        LinkRenderer.Transparency = targetTransparency;
                })
                .AddTo(_animationDisposables);
        }


        private void OnTriggerEnter(Collider other)
        {
            if (other.tag == "Player")
            {
                _isUserStandingInLine = true;
                UpdateTransparency();

                foreach (var collider in DisableColliders)
                    collider.enabled = false;

                foreach (var go in DisableOthers)
                    go.SetActive(false);
            }
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.tag == "Player")
            {
                _isUserStandingInLine = false;
                UpdateTransparency();

                foreach (var collider in DisableColliders)
                    collider.enabled = true;
                foreach (var go in DisableOthers)
                    go.SetActive(true);
            }
        }
    }
}

using Assets.Modules.GraphLinks;
using Assets.Modules.Networking;
using Assets.Modules.Plots;
using Assets.Modules.WebClients;
using System;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    public class GazeSelection : MonoBehaviour
    {
        private StreamClient _user;
        private WebClient _tablet;
        private Transform _cam;

        private LinkManager _links;
        private PlotManager _plots;
        private WebClientManager _webclients;

        private readonly CompositeDisposable _tabletDisposables = new CompositeDisposable();

        private float _gazeStartTime = 0f;
        private const float DEFAULT_DWELL_TIME = 1.75f;
        private const float VOICE_DWELL_TIME = 0.5f;
        private const float VERTICAL_DWELL_TIME = 0.5f;

        private bool _isCreatingLink = false;

        private void OnEnable()
        {
            _cam = Camera.main.transform;
            _user = StreamClient.Instance;
            _links = LinkManager.Instance as LinkManager;
            _plots = PlotManager.Instance as PlotManager;
            _webclients = WebClientManager.Instance as WebClientManager;

            // use timeout when creating links
            Link.AllModelChange()
                .Where(ev => ev.Model.CreatedBy == _user.Id && ev.ChangedProperties.Contains("CreatedBy"))
                .Subscribe(ev =>
                {
                    _isCreatingLink = true;
                    ResetProgress();
                    ev.Model.CreatedByRx
                        .Where(v => v < 0)
                        .Take(1)
                        .Delay(TimeSpan.FromSeconds(1))
                        .Subscribe(v => _isCreatingLink = false, () => _isCreatingLink = false);
                });

            _user.LookingAtIdRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(_ => ResetProgress());

            _user.LookingAtTypeRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(_ => ResetProgress());

            Link.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.Model.CreatedBy == _user.Id)
                .Subscribe(_ => ResetProgress());

            // disable & reset progress during zen mode
            _user.ZenModeRx
                .TakeUntilDisable(this)
                .Where(v => v && !(_tablet && _tablet.IsVoiceActive))
                .ObserveOnMainThread()
                .Subscribe(_ => ResetProgress());

            Plot.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("BoundTo") && _tablet != null && ev.Model.BoundTo == _tablet.Id)
                .Subscribe(_ => ResetProgress());


            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .Subscribe(ev => SearchCurrentTablet());

            Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
                .TakeUntilDisable(this)
                .Subscribe(m => SearchCurrentTablet());

        }

        private void OnDisable()
        {
            _tabletDisposables.Clear();
        }

        private void ResetProgress()
        {
            _user.SelectionProgress = -1;
            _gazeStartTime = Time.time;
        }


        private void Update()
        {
            UpdateSelection();

            // update metadata
            if (_user.SelectedId >= 0)
            {
                if (_user.SelectedType == "plot")
                    UpdatePlotMetadata();
                else if (_user.SelectedType == "link")
                    UpdateLinkMetadata();
            }
        }

        private void UpdateSelection()
        {
            var isTabletHorizontal = _tablet == null || _tablet.Orientation == "horizontal";
            var isVoiceActive = _tablet && _tablet.IsVoiceActive;
            // no interaction during zen mode (with exceptions)
            if (_user.ZenMode && isTabletHorizontal && !isVoiceActive)
                return;

            // don't switch selection while placing links
            if (_isCreatingLink)
                return;

            var lookingAtId = _user.LookingAtId;
            var lookingAtType = _user.LookingAtType;

            if (_tablet && _tablet.Orientation == "vertical")
            {
                lookingAtId = _tablet.LookingAtId;
                lookingAtType = _tablet.LookingAtType;
            }

            // avoid unnecessary updates
            if (lookingAtId == _user.SelectedId && lookingAtType == _user.SelectedType)
                return;

            if (string.IsNullOrEmpty(lookingAtType))
                return;

            // disable gaze selection while placing a plot
            if (_tablet && _plots.Get().Any(p => p.BoundTo == _tablet.Id))
                return;

            if (_user.SelectionProgress == -1)
            {
                _user.SelectionProgress = 0;
                _gazeStartTime = Time.time;
            }

            if (_user.SelectionProgress < 100)
            {
                var dwellTime = DEFAULT_DWELL_TIME;
                if (_tablet && _tablet.Orientation == WebClient.ORIENTATION_VERTICAL)
                    dwellTime = VERTICAL_DWELL_TIME;
                if (_tablet && _tablet.IsVoiceActive)
                    dwellTime = VOICE_DWELL_TIME;

                _user.SelectionProgress = Mathf.Min(100f, (Time.time - _gazeStartTime) / dwellTime * 100f);

                if (_user.SelectionProgress >= 100f)
                {
                    _user.SelectedId = lookingAtId;
                    _user.SelectedType = lookingAtType;
                }
            }


        }



        private void UpdatePlotMetadata()
        {
            var plot = _plots.Get(_user.SelectedId);
            if (!plot)
                return;

            var userPos = plot.transform.InverseTransformPoint(_cam.position);
            _user.SelectedMetadata = userPos.z <= 0 ? "front" : "back";
        }

        private void UpdateLinkMetadata()
        {
            var link = _links.Get(_user.SelectedId);
            if (!link)
                return;

            var linkPos = link.GetComponentInChildren<LinkPosition>();
            var userPos = linkPos.transform.InverseTransformPoint(_cam.position);
            var flowDirection = userPos.x >= 0 ? "ltr" : "rtl"; // left to right || right to left
            var side = "side";
            var extra = "";

            //if (Mathf.Abs(userPos.x) < 10 && Mathf.Abs(userPos.y) > 3)
            //{
            //    side = "top";

            //    var lookDirection = linkHitbox.transform.rotation * Camera.main.transform.forward;
            //    if (lookDirection.z <= 0)
            //        flowDirection = "rtl";
            //    else
            //        flowDirection = "ltr";
            //    if (userPos.y < 0)
            //        extra = "bottom";
            //}
            _user.SelectedMetadata = $"{side}|{flowDirection}|{extra}";
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

                        _tablet.ModelChange()
                            .Where(changes => changes.Contains("LookingAtType") || changes.Contains("LookingAtId") || changes.Contains("Orientation"))
                            .Subscribe(_ => ResetProgress())
                            .AddTo(_tabletDisposables);
                    }
                    return;
                }
            }

            // no matching client found
            _tabletDisposables.Clear();
            _tablet = null;
        }
    }
}

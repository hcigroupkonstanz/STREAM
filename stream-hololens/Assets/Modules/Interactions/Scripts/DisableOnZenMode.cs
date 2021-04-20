using Assets.Modules.Networking;
using UnityEngine;
using UniRx;
using Assets.Modules.WebClients;

public class DisableOnZenMode : MonoBehaviour
{
    private ArtsClient _user;
    private WebClient _tablet;
    private WebClientManager _webclients;

    private CompositeDisposable _tabletDisposables = new CompositeDisposable();

    private void Awake()
    {
        _webclients = WebClientManager.Instance as WebClientManager;

        _user = ArtsClient.Instance;
        _user.ZenModeRx
            .TakeUntilDestroy(this)
            .ObserveOnMainThread()
            .Subscribe(val => gameObject.SetActive(!val));

        WebClient.AllModelChange()
            .TakeUntilDisable(this)
            .Where(ev => ev.ChangedProperties.Contains("Owner"))
            .Subscribe(ev => SearchCurrentWebclient());

        Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
            .TakeUntilDisable(this)
            .Subscribe(m => SearchCurrentWebclient());
    }

    private void OnDestroy()
    {
        _tabletDisposables.Clear();
    }


    private void SearchCurrentWebclient()
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
                        .Where(changes => changes.Contains("IsVoiceActive"))
                        .Subscribe(_ => UpdateIsActive())
                        .AddTo(_tabletDisposables);
                    UpdateIsActive();
                }
                return;
            }
        }

        // no matching client found
        _tabletDisposables.Clear();
        _tablet = null;
        UpdateIsActive();
    }

    private void UpdateIsActive()
    {
        gameObject.SetActive(!_user.ZenMode || _tablet == null || _tablet.IsVoiceActive);
    }
}

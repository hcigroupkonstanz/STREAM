using Assets.Modules.Interactions;
using Assets.Modules.Networking;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Interactions
{
    public class EnableOnSelect : MonoBehaviour
    {
        public bool DisableOnZenMode = false;

        private IInteractable _target;
        private StreamClient _user;

        private void Awake()
        {
            _target = GetComponentInParent<IInteractable>();
            _user = StreamClient.Instance;

            Observable.Merge(_user.SelectedTypeRx, _user.SelectedIdRx.Select(_ => ""))
                .SampleFrame(1)
                .ObserveOnMainThread()
                .TakeUntilDestroy(this)
                .Subscribe(_ => UpdateEnabled());

            if (DisableOnZenMode)
            {
                _user.ZenModeRx
                    .ObserveOnMainThread()
                    .TakeUntilDestroy(this)
                    .Subscribe(_ => UpdateEnabled());
            }
        }

        private void UpdateEnabled()
        {
            if (!gameObject || !_user || _target == null)
                return;

            var isSelected = _user.SelectedId == _target.GetInteractionId()
                && _user.SelectedType == _target.GetInteractionType();

            if (DisableOnZenMode && _user.ZenMode)
                gameObject.SetActive(false);
            else
                gameObject.SetActive(isSelected);
        }
    }
}

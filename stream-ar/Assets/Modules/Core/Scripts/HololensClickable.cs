using Assets.Modules.Interactions;
using Assets.Modules.Networking;
using Microsoft.MixedReality.Toolkit.Input;
using System;
using UnityEngine;
using UnityEngine.Events;
using UniRx;

namespace Assets.Modules.Core
{
    [Serializable]
    public class OnClickEvent : UnityEvent<string> { }

    public class HololensClickable : MonoBehaviour, IInteractable
    {
        private static int Id = 0;
        public static readonly string BACKSPACE = "<back>";

        public string Input;
        public bool IsBackspace;
        public OnClickEvent OnClick;
        private int _id;

        public int GetInteractionId() => _id;
        public string GetInteractionType() => "button";

        private void Awake()
        {
            _id = Id++;
            var client = StreamClient.Instance;
            client.SelectedIdRx.TakeUntilDestroy(this).Subscribe(selectedId =>
            {
                if (client.SelectedType == "button" && selectedId == _id)
                    OnPointerClicked();
            });
        }

        public void OnPointerClicked()
        {
            var msg = Input;
            if (IsBackspace)
                msg = BACKSPACE;

            OnClick?.Invoke(msg);
        }
    }
}

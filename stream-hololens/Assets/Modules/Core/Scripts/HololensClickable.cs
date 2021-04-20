using Microsoft.MixedReality.Toolkit.Input;
using System;
using UnityEngine;
using UnityEngine.Events;

namespace Assets.Modules.Core
{
    [Serializable]
    public class OnClickEvent : UnityEvent<string> { }

    public class HololensClickable : MonoBehaviour, IMixedRealityPointerHandler
    {
        public static readonly string BACKSPACE = "<back>";

        public string Input;
        public bool IsBackspace;
        public OnClickEvent OnClick;

        public void OnPointerClicked(MixedRealityPointerEventData eventData)
        {
            var msg = Input;
            if (IsBackspace)
                msg = BACKSPACE;

            OnClick?.Invoke(msg);
        }

        public void OnPointerDown(MixedRealityPointerEventData eventData)
        {
        }

        public void OnPointerDragged(MixedRealityPointerEventData eventData)
        {
        }

        public void OnPointerUp(MixedRealityPointerEventData eventData)
        {
        }
    }
}

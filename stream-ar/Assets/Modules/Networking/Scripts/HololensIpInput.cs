using Assets.Modules.Core;
using UnityEngine;

namespace Assets.Modules.Networking
{
    [RequireComponent(typeof(NetworkStatus))]
    public class HololensIpInput : MonoBehaviour
    {
        private NetworkStatus _status;

        void OnEnable()
        {
            _status = GetComponent<NetworkStatus>();
        }

#if !STREAM_OBSERVER
        public void InputText(string text)
        {
            if (text == HololensClickable.BACKSPACE)
            {
                if (_status.IpInput.Length > 0)
                    _status.IpInput = _status.IpInput.Remove(_status.IpInput.Length - 1);
                //if (_status.IpInput.Length > 1)
                //    _status.IpInput = _status.IpInput.Substring(0, _status.IpInput.Length - 1);
                //else if (_status.IpInput.Length == 1)
                //    _status.IpInput = "";
            }
            else if (_status.IpInput.Length < 3)
            {
                _status.IpInput += text;
            }
        }
#endif
    }
}

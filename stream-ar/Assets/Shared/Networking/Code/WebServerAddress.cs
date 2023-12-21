using System;
using UnityEngine;

namespace Assets.Modules.Networking
{
    public static class WebServerAddress
    {
        const string PREF_LAST_IP = "last_known_server_ip";

        public static event Action OnAdressChange;

        private static string _current;
        public static string Current
        {
            get { return _current; }
            set
            {
                if (_current != value)
                {
                    _current = value;
                    OnAdressChange?.Invoke();

                    PlayerPrefs.SetString(PREF_LAST_IP, value);
                    PlayerPrefs.Save();
                }
            }
        }


        static WebServerAddress()
        {
            // load last known ip
            _current = PlayerPrefs.GetString(PREF_LAST_IP);
            if (String.IsNullOrEmpty(_current))
                _current = "localhost";
        }
    }
}

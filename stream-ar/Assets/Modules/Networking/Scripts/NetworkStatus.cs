using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using TMPro;
using UnityEngine;

namespace Assets.Modules.Networking
{
    public class NetworkStatus : MonoBehaviour
    {
        public TextMeshPro ServerIpTextRenderer;
        public TextMeshPro SubnetTextRenderer;
        public bool DisableChildWhenConnected = false;

        private string _ipInput = "";
        public string IpInput
        {
            get { return _ipInput; }
            set
            {
                _ipInput = value;
                SubnetTextRenderer.text = GetSubnet() + "<color=#00FF00>" + _ipInput + "</color>";
            }
        }

        private WebServerConnection _connection;

        private void OnEnable()
        {
            _connection = WebServerConnection.Instance;
            ServerIpTextRenderer.text =  String.IsNullOrEmpty(WebServerAddress.Current) ? "No Server specified" : WebServerAddress.Current;
            SubnetTextRenderer.text = GetSubnet();

            _connection.OnConnected += OnServerConnected;
            _connection.OnDisconnected += OnServerDisconnected;

            if (_connection.Status == ConnectionStatus.Connected || _connection.Status == ConnectionStatus.Connecting)
                OnServerConnected();
            else
                OnServerDisconnected();
        }

        private void OnDisable()
        {
            _connection.OnConnected -= OnServerConnected;
            _connection.OnDisconnected -= OnServerDisconnected;
        }

        private void OnServerConnected()
        {
            if (DisableChildWhenConnected)
                transform.GetChild(0)?.gameObject.SetActive(false);
        }

        private void OnServerDisconnected()
        {
            if (DisableChildWhenConnected)
                transform.GetChild(0)?.gameObject.SetActive(true);
        }

        public void OnReconnectClick()
        {
            if (!String.IsNullOrEmpty(_ipInput))
            {
                WebServerAddress.Current = GetSubnet() + _ipInput;
                ServerIpTextRenderer.text =  String.IsNullOrEmpty(WebServerAddress.Current) ? "No Server specified" : WebServerAddress.Current;
                IpInput = "";
            }
        }

        private string GetSubnet()
        {
            // see: https://stackoverflow.com/a/6803109/4090817
            var host = Dns.GetHostEntry(Dns.GetHostName());
            List<string> localIps = new List<string>();
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == AddressFamily.InterNetwork)
                {
                    localIps.Add(ip.ToString());
                }
            }

            string localIp;
            if (localIps.Count == 1)
            {
                localIp = localIps[0];
            }
            else if (localIps.Count > 1)
            {
                // use ip address 'closest' to 192.168. ...
                localIp = localIps[0];
                foreach (var ip in localIps)
                {
                    if (ip.StartsWith("192"))
                    {
                        localIp = ip;
                        break;
                    }
                }
            }
            else
            {
                Debug.LogError("Unable to retrieve subnet");
                localIp = "127.0.0.1";
            }

            var subnet = localIp.Remove(localIp.LastIndexOf('.') + 1);
            return subnet;
        }
    }
}

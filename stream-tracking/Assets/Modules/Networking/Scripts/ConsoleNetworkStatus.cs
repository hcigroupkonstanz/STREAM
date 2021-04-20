using Assets.Modules.Terminal;
using System;
using UnityEngine;

namespace Assets.Modules.Networking
{
    public class ConsoleNetworkStatus : MonoBehaviour
    {
        private WebServerConnection _connection;


        private void OnEnable()
        {
            _connection = WebServerConnection.Instance;
            Commands.RegisterCommand("connect", OnConnect);

            if (String.IsNullOrEmpty(WebServerAddress.Current))
            {
                Debug.LogWarning("Unable to establish webserver connection: No server specified!");
            }
            else
            {
                Debug.Log($"Connecting to {WebServerAddress.Current}");
            }
        }

        private void OnDisable()
        {
            Commands.UnregisterCommand("connect", OnConnect);
        }

        public void OnConnect(string[] parameters)
        {
            if (parameters.Length == 0)
            {
                Debug.LogWarning("Must provide server ip");
            }
            else if (parameters.Length > 1)
            {
                Debug.LogWarning($"Unable to connect: Expected one argument, got {parameters.Length}");
            }
            else
            {
                WebServerAddress.Current = parameters[0];
                Debug.Log($"Trying to connect to {parameters[0]}");
            }
        }
    }
}

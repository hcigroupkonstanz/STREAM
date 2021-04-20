using UnityEditor;
using UnityEngine;

namespace Assets.Modules.Networking
{
    [CustomEditor(typeof(ConsoleNetworkStatus))]
    public class NetworkStatusEditor : Editor
    {
        private string _input = "";

        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            ConsoleNetworkStatus status = (ConsoleNetworkStatus)target;

            _input = GUILayout.TextField(_input);

            if (GUILayout.Button("Reconnect") && Application.isPlaying)
            {
                status.OnConnect(new[] { _input });
                _input = "";
            }
        }
    }
}

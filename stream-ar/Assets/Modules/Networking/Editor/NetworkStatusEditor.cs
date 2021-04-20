using UnityEditor;
using UnityEngine;

namespace Assets.Modules.Networking
{
    [CustomEditor(typeof(NetworkStatus))]
    public class NetworkStatusEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            NetworkStatus status = (NetworkStatus)target;

            status.IpInput = GUILayout.TextField(status.IpInput, 3);

            if (GUILayout.Button("Reconnect") && Application.isPlaying)
            {
                status.OnReconnectClick();
            }
        }
    }
}

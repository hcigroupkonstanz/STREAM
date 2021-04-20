using Assets.Modules.Networking;
using UnityEditor;
using UnityEngine;

namespace Assets.Modules.ArClients
{
    [CustomEditor(typeof(ArClient))]
    public class ArClientEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            ArClient client = (ArClient)target;

            EditorGUILayout.LabelField($"ID: {client.Id}");
            EditorGUILayout.LabelField($"Name: {client.Name}");
            EditorGUILayout.LabelField($"IsCalibrating: {client.IsCalibrating}");

            if (GUILayout.Button("Start Calibration") && Application.isPlaying)
                client.IsCalibrating = true;
        }
    }
}

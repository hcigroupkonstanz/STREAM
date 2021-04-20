using UnityEditor;
using UnityEngine;

namespace Assets.Modules.Networking
{
    [CustomEditor(typeof(StreamClient))]
    public class StreamClientEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            StreamClient client = (StreamClient)target;

            EditorGUILayout.LabelField($"ID: {client.Id}");
            EditorGUILayout.LabelField($"Name: {client.Name}");
            EditorGUILayout.LabelField($"Position: {client.Position}");
            EditorGUILayout.LabelField($"Rotation: {client.Rotation}");
            EditorGUILayout.LabelField($"OffsetMatrix: {client.OffsetMatrix}");
            EditorGUILayout.LabelField($"IsCalibrating: {client.IsCalibrating}");
            EditorGUILayout.LabelField($"SelectedId: {client.SelectedId}");
            EditorGUILayout.LabelField($"SelectedType: {client.SelectedType}");
            EditorGUILayout.LabelField($"SelectedMetadata: {client.SelectedMetadata}");
            EditorGUILayout.LabelField($"LookingAtId: {client.LookingAtId}");
            EditorGUILayout.LabelField($"LookingAtType: {client.LookingAtType}");
            EditorGUILayout.LabelField($"PlacementHeightOffset: {client.PlacementHeightOffset}");
            EditorGUILayout.LabelField($"IndicatorPosition: {client.IndicatorPosition}");
            EditorGUILayout.LabelField($"DebugIndicators: {client.DebugIndicators}");
            EditorGUILayout.LabelField($"ZenMode: {client.ZenMode}");
            EditorGUILayout.LabelField($"Selection Progress: {client.SelectionProgress}");
            EditorGUILayout.LabelField($"Spectating: {client.Spectating?.Id}");

            if (GUILayout.Button("Reset Calibration") && Application.isPlaying)
                client.OffsetMatrix = Matrix4x4.identity;

            if (GUILayout.Button("Random Calibration") && Application.isPlaying)
                client.OffsetMatrix = Matrix4x4.TRS(new Vector3(Random.value * 0.1f - 0.05f, Random.value * 0.1f - 0.05f, Random.value * 0.1f - 0.05f), Random.rotation, Vector3.one);

            if (GUILayout.Button("Toggle Calibration") && Application.isPlaying)
                client.IsCalibrating = !client.IsCalibrating;

            if (GUILayout.Button("Toggle Debug") && Application.isPlaying)
                client.DebugIndicators = !client.DebugIndicators;

            Repaint();
        }
    }
}

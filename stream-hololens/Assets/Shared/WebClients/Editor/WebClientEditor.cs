using Newtonsoft.Json;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace Assets.Modules.WebClients
{
    [CustomEditor(typeof(WebClient))]
    public class WebClientEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            WebClient client = (WebClient)target;
            var clientSize = client.GetDeviceSizeCm();

            EditorGUILayout.LabelField($"ID: {client.Id}");
            EditorGUILayout.LabelField($"Name: {client.Name}");
            EditorGUILayout.LabelField($"IsCalibrating: {client.IsCalibrating}");
            EditorGUILayout.LabelField($"Owner: {client.Owner}");
            EditorGUILayout.LabelField($"Orientation: {client.Orientation}");
            EditorGUILayout.LabelField($"OffsetMatrix: {client.OffsetMatrices?.ToString()}");
            EditorGUILayout.LabelField($"Width (cm): {clientSize.x}");
            EditorGUILayout.LabelField($"Height (cm): {clientSize.y}");
            EditorGUILayout.LabelField($"LookingAtId: {client.LookingAtId}");
            EditorGUILayout.LabelField($"LookingAtType: {client.LookingAtType}");
            EditorGUILayout.TextArea($"ScreenMenu: {JsonConvert.SerializeObject(client.ScreenMenu, Formatting.Indented)}");

            if (GUILayout.Button("Reset Calibration") && Application.isPlaying)
            {
                var matrices = new List<Matrix4x4>();
                foreach (var tracker in client.Trackers)
                    matrices.Add(Matrix4x4.identity);
                client.OffsetMatrices = matrices.ToArray();
            }

            if (GUILayout.Button("Random Calibration") && Application.isPlaying)
            {
                var matrices = new List<Matrix4x4>();
                foreach (var tracker in client.Trackers)
                    matrices.Add(Matrix4x4.TRS(new Vector3(Random.value * 0.1f - 0.05f, Random.value * 0.1f - 0.05f, Random.value * 0.1f - 0.05f), Random.rotation, Vector3.one));
                client.OffsetMatrices = matrices.ToArray();
            }
        }
    }
}

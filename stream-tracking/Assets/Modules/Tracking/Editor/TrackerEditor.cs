using UnityEditor;
using UnityEngine;

namespace Assets.Modules.Tracking
{
    [CustomEditor(typeof(Tracker))]
    public class TrackerEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();

            var tracker = (Tracker)target;
            EditorGUILayout.LabelField($"ID: {tracker.Id}");
            EditorGUILayout.LabelField($"HardwareID: {tracker.HardwareId}");
            EditorGUILayout.LabelField($"Name: {tracker.Name}");
            EditorGUILayout.LabelField($"IsActive: {tracker.IsActive}");


            if (GUILayout.Button("Set Origin 1 here") && Application.isPlaying)
            {
                var manager = FindObjectOfType<RemoteTrackerManager>();
                if (manager)
                    manager.SetOrigin(1, tracker);
                else
                    Debug.LogWarning("Unable to set origin: Could not find RemoteTrackerManager");
            }

            if (GUILayout.Button("Set Origin 2 here") && Application.isPlaying)
            {
                var manager = FindObjectOfType<RemoteTrackerManager>();
                if (manager)
                    manager.SetOrigin(2, tracker);
                else
                    Debug.LogWarning("Unable to set origin: Could not find RemoteTrackerManager");
            }
        }
    }
}

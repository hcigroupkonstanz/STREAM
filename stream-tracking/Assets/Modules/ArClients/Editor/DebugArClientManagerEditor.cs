using UnityEditor;
using UnityEngine;

namespace Assets.Modules.ArClients
{
    [CustomEditor(typeof(DebugArClientManager))]
    public class DebugArClientManagerEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();

            DebugArClientManager debugManager = (DebugArClientManager)target;
            ArClientManager manager = debugManager.GetComponent<ArClientManager>();

            if (GUILayout.Button("Randomize offset matrices") && Application.isPlaying)
            {
                foreach (var client in manager.Get())
                {
                    client.OffsetMatrix = Matrix4x4.TRS(Random.insideUnitSphere * 3f, Random.rotation, Vector3.one);
                }
            }
        }
    }
}

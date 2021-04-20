using UnityEditor;

namespace Assets.Modules.GraphLinks
{
    [CustomEditor(typeof(Link))]
    public class LinkEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            Link link = (Link)target;

            EditorGUILayout.LabelField($"ID: {link.Id}");
            EditorGUILayout.LabelField($"Upstream: {link.Upstream}");
            EditorGUILayout.LabelField($"Downstream: {link.Downstream}");
            EditorGUILayout.LabelField($"CreatedBy: {link.CreatedBy}");

            Repaint();
        }
    }
}

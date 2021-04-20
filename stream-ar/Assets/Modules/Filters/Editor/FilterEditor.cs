using UnityEditor;

namespace Assets.Modules.Filters
{
    [CustomEditor(typeof(Filter))]
    public class FilterEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            Filter filter = (Filter)target;

            EditorGUILayout.LabelField($"ID: {filter.Id}");
            EditorGUILayout.LabelField($"UUID: {filter.Uuid}");
            EditorGUILayout.LabelField($"Origin: {filter.Origin}");
        }
    }
}

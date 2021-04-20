using UnityEditor;

namespace Assets.Modules.Plots
{
    [CustomEditor(typeof(Plot))]
    public class PlotEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            Plot plot = (Plot)target;

            EditorGUILayout.LabelField($"ID: {plot.Id}");
            EditorGUILayout.LabelField($"Color: {plot.Color}");
            EditorGUILayout.LabelField($"BoundTo: {plot.BoundTo}");
            EditorGUILayout.LabelField($"LockedToAxis: {plot.LockedToAxis}");
            EditorGUILayout.LabelField($"PositioningOffset: {plot.PositioningOffset}");
            EditorGUILayout.LabelField($"X: {plot.DimX}");
            EditorGUILayout.LabelField($"Y: {plot.DimY}");
            EditorGUILayout.LabelField($"UseColor: {plot.UseColor}");
            EditorGUILayout.LabelField($"UseFilter: {plot.UseFilter}");
            EditorGUILayout.LabelField($"Data (Length): {plot.Data?.Length}");
#if MIDAIR_AR
            EditorGUILayout.LabelField($"IsPositioning: {plot.IsPositioning}");
#endif

            Repaint();
        }
    }
}

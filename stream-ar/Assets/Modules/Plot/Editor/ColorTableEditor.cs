using Newtonsoft.Json;
using UnityEditor;

namespace Assets.Modules.Plots
{
    [CustomEditor(typeof(ColorTable))]
    public class ColorTableEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            ColorTable ct = (ColorTable)target;

            EditorGUILayout.LabelField($"ID: {ct.Id}");
            EditorGUILayout.LabelField($"Color: {JsonConvert.SerializeObject(ct.PlotIds)}");

            Repaint();
        }
    }
}

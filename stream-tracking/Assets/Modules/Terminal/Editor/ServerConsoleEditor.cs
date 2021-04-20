using UnityEditor;
using UnityEngine;

namespace Assets.Modules.Terminal
{
    [CustomEditor(typeof(ServerConsole))]
    public class ServerConsoleEditor : Editor
    {
        private string _input;

        public override void OnInspectorGUI()
        {
            base.OnInspectorGUI();
            ServerConsole console = (ServerConsole)target;
            _input = GUILayout.TextField(_input);

            if (Event.current.type == EventType.KeyDown && Event.current.character == '\n')
            {
                console.OnInputText(_input);
                _input = "";
            }
        }
    }
}

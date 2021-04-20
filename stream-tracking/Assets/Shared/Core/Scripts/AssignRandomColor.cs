using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Assets.Modules.Core
{
    [RequireComponent(typeof(Renderer))]
    public class AssignRandomColor : MonoBehaviour
    {
        private static Color[] _colors =
        {
            new Color32(33, 150, 243, 255), // blue
            new Color32(76, 175, 80, 255), // green
            new Color32(255, 152, 0, 255), // orange
            new Color32(156, 39, 176, 255), // purple
            new Color32(63, 81, 181, 255), // indigo
            new Color32(255, 235, 59, 255), // yellow
            new Color32(244, 67, 54, 255) // red
        };
        private static int _colorCounter = 0;

        private void Awake()
        {
            var renderer = GetComponent<Renderer>();
            var mat = Instantiate(renderer.material);
            renderer.material = mat;
            mat.color = _colors[_colorCounter];

            _colorCounter = (_colorCounter + 1) % _colors.Length;
        }
    }
}

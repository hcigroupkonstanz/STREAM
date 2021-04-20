using System;
using System.Collections.Generic;
using System.Linq;
using TMPro;
using UnityEngine;

namespace Assets.Modules.HUD
{
    public class LogOutput : MonoBehaviour
    {
        public TextMeshPro Log;
        private List<string> Lines = new List<string>();

        private void OnEnable()
        {
            Application.logMessageReceived += OnLogMessage;
        }

        private void OnDisable()
        {
            Application.logMessageReceived -= OnLogMessage;
        }

        private void OnLogMessage(string condition, string stackTrace, LogType type)
        {
            string textColor;

            switch (type)
            {
                case LogType.Log:
                    textColor = "#FFFFFF";
                    break;

                case LogType.Warning:
                    textColor = "#FFC107";
                    break;

                case LogType.Error:
                case LogType.Exception:
                    textColor = "#f44336";
                    break;

                case LogType.Assert:
                default:
                    textColor = "#757575";
                    break;
            }

            while (Lines.Count > 10)
                Lines.RemoveAt(0);

            Lines.Add($"<color={textColor}>{condition}</color>");
            if (type == LogType.Error || type == LogType.Exception)
                Lines.Add($"<color={textColor}>{stackTrace}</color>");
            Log.text = String.Join(Environment.NewLine, Lines);
        }
    }
}

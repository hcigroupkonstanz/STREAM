using System;
using System.Text.RegularExpressions;
using UnityConsole;
using UnityEngine;

namespace Assets.Modules.Terminal
{
    public class ServerConsole : MonoBehaviour
    {
#if UNITY_STANDALONE_WIN && !UNITY_EDITOR

        ConsoleWindow console = new ConsoleWindow();
        ConsoleInput input = new ConsoleInput();

        // Create console window, register callbacks
        void Awake()
        {
            DontDestroyOnLoad(gameObject);

            console.Initialize();
            console.SetTitle("STREAM Server");

            input.OnInputText += OnInputText;

            Application.logMessageReceived += HandleLog;

            Debug.Log("Console Started");
        }

        // Debug.Log* callback
        void HandleLog(string message, string stackTrace, LogType type)
        {
            if (type == LogType.Warning)
                Console.ForegroundColor = ConsoleColor.Yellow;
            else if (type == LogType.Error)
                Console.ForegroundColor = ConsoleColor.Red;
            else
                Console.ForegroundColor = ConsoleColor.White;

            // We're half way through typing something, so clear this line ..
            if (Console.CursorLeft != 0)
                input.ClearLine();

            Console.WriteLine(message);

            // If we were typing something re-add it.
            input.RedrawInputLine();
        }

        // Update the input every frame
        // This gets new key input and calls the OnInputText callback
        void Update()
        {
            input.Update();
        }

        // It's important to call console.ShutDown in OnDestroy
        // because compiling will error out in the editor if you don't
        // because we redirected output. This sets it back to normal.
        void OnDestroy()
        {
            console.Shutdown();
        }

#endif


        // Text has been entered into the console
        // Run it as a console command
        public void OnInputText(string msg)
        {
            if (String.IsNullOrEmpty(msg))
                return;

            var match = Regex.Match(msg.ToLower(), @"^(\w*) ?(.*?)$");
            if (match.Success)
            {
                var action = match.Groups[1].Value;
                var parameters = new String[0];
                Debug.Log(match.Groups[2].Value);

                if (!String.IsNullOrEmpty(match.Groups[2].Value))
                {
                    parameters = match.Groups[2].Value.Split(' ');
                }

                Commands.ExecuteCommand(action, parameters);
            }
            else
            {
                Debug.LogError("Unable to execute: " + msg);
            }
        }
    }
}
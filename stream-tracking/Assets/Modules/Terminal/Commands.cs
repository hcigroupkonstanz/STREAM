using System.Collections.Generic;
using UnityEngine;

namespace Assets.Modules.Terminal
{
    public static class Commands
    {
        public delegate void CommandEvent(string[] parameters);
        private static Dictionary<string, List<CommandEvent>> _registeredCommands = new Dictionary<string, List<CommandEvent>>();

        public static void RegisterCommand(string name, CommandEvent action)
        {
            name = name.ToLower();
            if (!_registeredCommands.ContainsKey(name))
            {
                _registeredCommands.Add(name, new List<CommandEvent>());
            }

            _registeredCommands[name].Add(action);
        }

        public static void UnregisterCommand(string name, CommandEvent action)
        {
            name = name.ToLower();
            if (_registeredCommands.ContainsKey(name))
            {
                _registeredCommands[name].Remove(action);
            }
        }

        public static void ExecuteCommand(string name, string[] parameters)
        {
            name = name.ToLower();
            if (_registeredCommands.ContainsKey(name))
            {
                foreach (var action in _registeredCommands[name])
                {
                    action.Invoke(parameters);
                }
            }
            else
            {
                Debug.LogWarning("Command not found: " + name);
            }
        }
    }
}

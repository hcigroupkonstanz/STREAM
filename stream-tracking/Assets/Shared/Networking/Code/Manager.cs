using Assets.Modules.Core;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Networking
{
    public abstract class Manager<T> : SingletonBehaviour<Manager<T>>
        where T : ObservableModel<T>
    {
        public T Template;

        protected abstract int Channel { get; }

        private readonly Dictionary<string, Action<JToken>> _registeredCommands = new Dictionary<string, Action<JToken>>();

        private BehaviorSubject<bool> _isInitialized = new BehaviorSubject<bool>(false);
        public IObservable<bool> Initialized => _isInitialized.Where(x => x).First();

        protected WebServerConnection _connection;
        protected readonly List<T> _currentModels = new List<T>();

        protected override void Awake()
        {
            base.Awake();
            Action<JToken> addCmd = obj =>
            {
                var objId = obj["id"];
                if (objId != null)
                {
                    var id = objId.Value<int>();
                    var model = AddModel(id);
                    model.RemoteUpdate(obj as JObject);
                }
            };

            AddCommand("add", addCmd);
            AddCommand("update", addCmd);
            AddCommand("request", data =>
            {
                var vals = data as JArray ?? new JArray();
                foreach (var m in vals)
                {
                    var mId = m["id"];
                    if (mId != null)
                    {
                        var id = mId.Value<int>();
                        var model = AddModel(id);
                        model.RemoteUpdate(m as JObject);
                    }
                }

                _isInitialized.OnNext(true);
            });

            AddCommand("remove", obj =>
            {
                if (obj["id"] != null)
                    RemoveModel(obj["id"].Value<int>());
            });
        }


        protected virtual void OnEnable()
        {
            _connection = WebServerConnection.Instance;
            _connection.OnConnected += InitRemote;
            _connection.OnDisconnected += TerminateRemote;

            if (_connection.Status == ConnectionStatus.Connected)
                InitRemote();

            if (Template == null)
            {
                Debug.LogError("No template set");
                enabled = false;
            }
        }

        protected virtual void OnDisable()
        {
            _connection.OnConnected -= InitRemote;
            _connection.OnDisconnected -= TerminateRemote;

            TerminateRemote();
        }


        protected void AddCommand(string command, Action<JToken> action)
        {
            if (_registeredCommands.ContainsKey(command))
                Debug.LogWarning($"Overwriting command {command} in {Channel}!");

            _registeredCommands[command] = action;
        }

        protected void RemoveCommand(string command)
        {
            _registeredCommands.Remove(command);
        }


        private void InitRemote()
        {
            if (_isInitialized.Value)
                return;

            _connection.SendCommand(Channel, "request", null);
            _connection.OnMessageReceived += OnServerMessage;
        }


        private void TerminateRemote()
        {
            if (!_isInitialized.Value)
                return;

            var modelsCopy = _currentModels.ToArray();
            foreach (var model in modelsCopy)
            {
                RemoveModel(model);
            }

            _connection.OnMessageReceived -= OnServerMessage;
            _isInitialized.OnNext(false);
        }

        private bool hasLoggedWarning = false;
        private void OnServerMessage(int channel, string command, JToken payload)
        {
            // for debugging
            if (channel == Channel && command != "request" && !_isInitialized.Value && !hasLoggedWarning)
            {
                hasLoggedWarning = true;
                Debug.LogWarning($"Received message on {channel} (cmd {command}) before initialization");
            }


            if (channel == Channel)
            {
                if (_registeredCommands.ContainsKey(command))
                    _registeredCommands[command](payload);
                else
                {
                    Debug.LogWarning($"Unknown command {command} in {channel}");
                    // register empty command to suppress future warnings
                    AddCommand(command, obj => { });
                }
            }
        }


        public virtual T AddModel(int id)
        {
            var model = Get(id);
            if (model)
                return model;

            Template.enabled = false;
            model = Instantiate(Template);
            model.transform.SetParent(transform, false);
            model.Id = id;
            model.name = $"{typeof(T).Name} ({id})";
            _currentModels.Add(model);

            model.LocalChange().Subscribe(async changes =>
                {
                    await _connection.Connected;
                    _connection.SendCommand(Channel, "update", model.ToJson(changes));
                });

            model.RemoteChange()
                .Take(1)
                .Subscribe(_ => model.enabled = true);

            return model;
        }


        public virtual void RemoveModel(int id)
        {
            var model = Get(id);
            if (model)
                RemoveModel(model);
        }


        public virtual void RemoveModel(T model)
        {
            _currentModels.Remove(model);
            if (model != null)
                Destroy(model.gameObject);
        }


        public IEnumerable<T> Get()
        {
            return _currentModels;
        }

        public T Get(int id)
        {
            return _currentModels.FirstOrDefault(m => m.Id == id);
        }
    }
}

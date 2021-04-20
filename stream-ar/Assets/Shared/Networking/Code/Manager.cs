using Assets.Modules.Core;
using Newtonsoft.Json.Linq;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;
using static Assets.Modules.Networking.WebServerConnection;

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

        private readonly Subject<InPacket> OnCommand = new Subject<InPacket>();
        private IDisposable _serverMessageSubscription; 

        protected override void Awake()
        {
            base.Awake();

            OnCommand
                .Where(p => p.command == "add" || p.command == "update")
                .Subscribe(async p =>
                {
                    var objId = p.payload["id"];
                    if (objId != null)
                    {
                        var id = objId.Value<int>();
                        var model = await AddModel(id).First(m => m != null);
                        model.RemoteUpdate(p.payload as JObject);
                    }
                });

            //AddCommand("add", addCmd);
            //AddCommand("update", addCmd);
            //AddCommand("request", data =>

            OnCommand
                .Where(p => p.command == "request")
                .Subscribe(async p =>
                {
                    var vals = p.payload as JArray ?? new JArray();
                    foreach (var m in vals)
                    {
                        var mId = m["id"];
                        if (mId != null)
                        {
                            var id = mId.Value<int>();
                            var model = await AddModel(id).First(x => x != null);
                            model.RemoteUpdate(m as JObject);
                        }
                    }

                    _isInitialized.OnNext(true);
                });

            //AddCommand("remove", obj =>
            OnCommand
                .Where(p => p.command == "remove")
                .ObserveOnMainThread()
                .Subscribe(p =>
                {
                    if (p.payload["id"] != null)
                        RemoveModel(p.payload["id"].Value<int>());
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


        //protected void AddCommand(string command, Action<JToken> action)
        //{
        //    if (_registeredCommands.ContainsKey(command))
        //        Debug.LogWarning($"Overwriting command {command} in {Channel}!");

        //    _registeredCommands[command] = action;
        //}

        protected void RemoveCommand(string command)
        {
            _registeredCommands.Remove(command);
        }


        private void InitRemote()
        {
            if (_isInitialized.Value)
                return;

            _connection.SendCommand(Channel, "request", null);
            _serverMessageSubscription = ServerMessagesAsync
                .Where(msg => msg.channel == Channel)
                .Subscribe(msg => OnServerMessage(msg));
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

            _isInitialized.OnNext(false);
            if (_serverMessageSubscription != null)
            {
                _serverMessageSubscription.Dispose();
                _serverMessageSubscription = null;
            }
        }

        private bool hasLoggedWarning = false;
        private void OnServerMessage(InPacket packet)
        {
            // for debugging
            if (packet.command != "request" && !_isInitialized.Value && !hasLoggedWarning)
            {
                hasLoggedWarning = true;
                Debug.LogWarning($"Received message on {Channel} (cmd {packet.command}) before initialization");
            }

            OnCommand.OnNext(packet); 
        }


        public virtual BehaviorSubject<T> AddModel(int id)
        {
            var subject = new BehaviorSubject<T>(null);
            MainThreadDispatcher.SendStartCoroutine(CreateModel(id, subject));

            return subject;
        }

        public IEnumerator CreateModel(int id, BehaviorSubject<T> subject)
        {
            var model = Get(id);
            if (model)
            {
                subject.OnNext(model);
            }
            else
            {
                Template.enabled = false;
                model = Instantiate(Template);
                model.transform.SetParent(transform, false);
                model.Id = id;
                model.name = $"{typeof(T).Name} ({id})";
                _currentModels.Add(model);

                model.LocalChangeAsync().Subscribe(async changes =>
                    {
                        await _connection.Connected;
                        await Observable.Start(() => _connection.SendCommand(Channel, "update", model.ToJson(changes)));
                    });

                model.RemoteChange()
                    .Take(1)
                    .Where(_ => model != null)
                    .Subscribe(_ => model.enabled = true);

                subject.OnNext(model);
            }

            yield return null;
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

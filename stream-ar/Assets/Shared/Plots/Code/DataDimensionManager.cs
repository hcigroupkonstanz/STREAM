using Assets.Modules.Core;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Plots
{
    public class DataDimensionManager : SingletonBehaviour<DataDimensionManager>
    {
        const string ApiEndpoint = "data/";
        private readonly BehaviorSubject<List<DataDimension>> _dimensions = new BehaviorSubject<List<DataDimension>>(new List<DataDimension>());

        private void OnEnable()
        {
            var connection = WebServerConnection.Instance;
            connection.OnConnected += InitRemote;
            connection.OnDisconnected += TerminateRemote;

            WebServerConnection.ServerMessagesAsync
                .TakeUntilDisable(this)
                .Where(p => p.channel == NetworkChannel.DATA)
                .Where(p => p.command == "data-reload")
                .Subscribe(p => ProcessUpdate(p.payload as JArray));

            InitRemote();
        }

        private void OnDisable()
        {
            var connection = WebServerConnection.Instance;
            connection.OnConnected -= InitRemote;
            connection.OnDisconnected -= TerminateRemote;
        }


        private async void InitRemote()
        {
            try
            {
                var models = await RestAPI.Get(ApiEndpoint);
                ProcessUpdate(models);
            }
            catch (Exception e)
            {
                Debug.LogError(e);
            }
        }

        private void TerminateRemote()
        {
            _dimensions.OnNext(new List<DataDimension>());
        }

        private void ProcessUpdate(JArray models)
        {
            var dims = new List<DataDimension>(models.Count);
            foreach (var model in models)
            {
                var dim = new DataDimension();
                dim.Column = model["column"].Value<string>();
                dim.DisplayName = model["displayName"].Value<string>();
                dim.HideTicks = model["hideTicks"].Value<bool>();
                dim.Ticks = model["ticks"].Select(t => new DataDimension.Tick
                {
                    Name = t["name"].Value<string>(),
                    Value = t["value"].Value<float>()
                }).ToArray();

                dims.Add(dim);
            }

            _dimensions.OnNext(dims);
        }

        public IObservable<DataDimension> GetDimension(string column)
        {
            return _dimensions
                .TakeUntilDisable(this)
                .Where(dims => dims.Any(d => d.Column == column))
                .Select(dims => dims.FirstOrDefault(d => d.Column == column))
                .Take(1)
                .ObserveOnMainThread();
        }

        public IObservable<IEnumerable<DataDimension>> GetDimensions()
        {
            return _dimensions.ObserveOnMainThread();
        }
    }
}

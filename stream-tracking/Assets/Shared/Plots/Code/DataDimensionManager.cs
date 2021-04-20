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
        private readonly List<DataDimension> _dimensions = new List<DataDimension>();
        private BehaviorSubject<bool> _isInitialized = new BehaviorSubject<bool>(false);

        private void OnEnable()
        {
            var connection = WebServerConnection.Instance;
            connection.OnConnected += InitRemote;
            connection.OnDisconnected += TerminateRemote;

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
            if (_isInitialized.Value)
                return;

            try
            {
                var models = await RestAPI.Get(ApiEndpoint);
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

                    _dimensions.Add(dim);
                }

                _isInitialized.OnNext(true);
            }
            catch (Exception e)
            {
                Debug.LogError(e.Message);
            }
        }

        private void TerminateRemote()
        {
            if (!_isInitialized.Value)
                return;
            _dimensions.Clear();
            _isInitialized.OnNext(false);
        }


        public IObservable<DataDimension> GetDimension(string column)
        {
            return _isInitialized.Where(x => x).First().Select(_ => _dimensions.FirstOrDefault(d => d.Column == column));
        }

        public IObservable<IEnumerable<DataDimension>> GetDimensions()
        {
            return _isInitialized.Where(x => x).First().Select(_ => _dimensions);
        }
    }
}

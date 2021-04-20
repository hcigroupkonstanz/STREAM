using Assets.Modules.ArClients;
using Assets.Modules.Networking;
using UnityEngine;
using UniRx;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;
using System;

namespace Assets.Modules.WebClients
{
    [RequireComponent(typeof(WebClientManager))]
    public class ArClientAssigner : MonoBehaviour
    {
        // weight for building avg - lower weight means newer values have less impact, but slower change in avg
        const float WEIGHT = 0.0001f;

        private WebClientManager _webClients;
        private Manager<ArClient> _arClients;

        private readonly CompositeDisposable _disposables = new CompositeDisposable();
        private readonly List<DistanceMeasure> _measurements = new List<DistanceMeasure>();
        private class DistanceMeasure
        {
            public WebClient Web;
            public ArClient Ar;
            public float AvgDistance;
        }

        private void OnEnable()
        {
            _webClients = GetComponent<WebClientManager>();
            _arClients = ArClientManager.Instance;

            ArClient.ModelCreated()
               .Subscribe(c => AddArClient(c))
               .AddTo(_disposables);
            ArClient.ModelDestroyed()
                .Subscribe(c => RemoveArClient(c))
               .AddTo(_disposables);

            WebClient.ModelCreated()
               .Subscribe(c => AddWebClient(c))
               .AddTo(_disposables);
            WebClient.ModelDestroyed()
                .Subscribe(c => RemoveWebClient(c))
               .AddTo(_disposables);
        }

        private void OnDisable()
        {
            _measurements.Clear();
            _disposables.Clear();
        }


        private void Update()
        {
            foreach (var m in _measurements)
                m.AvgDistance = DistanceBetween(m.Ar, m.Web) * WEIGHT + m.AvgDistance * (1 - WEIGHT);


            var newOwners = new Dictionary<WebClient, int>();
            foreach (var webclient in _webClients.Get())
                newOwners.Add(webclient, -1);

            var orderedMeasurements = _measurements.OrderBy(m => m.AvgDistance);
            var assignedClients = new List<WebClient>();
            var assignedOwners = new List<ArClient>();

            foreach (var m in orderedMeasurements)
            {
                if (!assignedOwners.Contains(m.Ar) && !assignedClients.Contains(m.Web))
                {
                    newOwners[m.Web] = m.Ar.Id;
                    assignedClients.Add(m.Web);
                    assignedOwners.Add(m.Ar);
                }
            }

            foreach (var client in newOwners.Keys)
            {
                client.Owner = newOwners[client];
            }
        }

        private float DistanceBetween(ArClient ar, WebClient web)
        {
            return (ar.Target.position - web.transform.position).sqrMagnitude;
        }

        private void AddArClient(ArClient ar)
        {
            foreach (var web in _webClients.Get())
                AddEntry(ar, web);
        }

        private void AddWebClient(WebClient web)
        {
            foreach (var ar in _arClients.Get())
                AddEntry(ar, web);
        }

        private void RemoveArClient(ArClient client)
        {
            _measurements.RemoveAll(m => m.Ar == client);
        }

        private void RemoveWebClient(WebClient client)
        {
            _measurements.RemoveAll(m => m.Web == client);
        }


        private void AddEntry(ArClient ar, WebClient web)
        {
            _measurements.Add(new DistanceMeasure()
            {
                Ar = ar,
                Web = web,
                AvgDistance = DistanceBetween(ar, web)
            });
        }
    }
}

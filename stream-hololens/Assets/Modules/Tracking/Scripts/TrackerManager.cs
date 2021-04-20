using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Tracking
{
    public class TrackerManager : Manager<Tracker>
    {
        protected override int Channel => NetworkChannel.TRACKER;

        public IEnumerable<Tracker> GetActiveTrackers()
        {
            return _currentModels.Where(c => c.gameObject.activeSelf);
        }
    }
}

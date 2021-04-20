using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace Assets.Modules.ArClients
{
    public class ArClientManager : Manager<ArClient>
    {
        protected override int Channel => NetworkChannel.ARCLIENT;
    }
}

using Assets.Modules.Networking;

namespace Assets.Modules.WebClients
{
    public class WebClientManager : Manager<WebClient>
    {
        protected override int Channel => NetworkChannel.WEBCLIENT;
    }
}

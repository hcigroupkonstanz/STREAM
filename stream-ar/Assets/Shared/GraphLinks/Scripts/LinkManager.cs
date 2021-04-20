using Assets.Modules.Networking;

namespace Assets.Modules.GraphLinks
{
    public class LinkManager : Manager<Link>
    {
        protected override int Channel => NetworkChannel.LINK;
    }
}

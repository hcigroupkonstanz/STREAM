using Assets.Modules.Networking;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Observer
{
    public class SpectatorTracker : MonoBehaviour
    {
        public Camera ArCamera;
        public Camera SpectatorCamera;

        private void OnEnable()
        {
            var me = StreamClient.Instance;
            me.SpectatingRx
                .TakeUntilDisable(this)
                .Subscribe(client =>
                {
                    if (client == null)
                    {
                        ArCamera.tag = "MainCamera";
                        SpectatorCamera.tag = "Untagged";
                    }
                    else
                    {
                        ArCamera.tag = "Untagged";
                        SpectatorCamera.tag = "MainCamera";
                    }

                    ArCamera.enabled = client == null;
                    SpectatorCamera.enabled = client != null;

                    if (client)
                    {
                        client.PositionRx
                            .TakeWhile(_ => me.SpectatingRx.Value == client)
                            .ObserveOnMainThread()
                            .Subscribe(pos => SpectatorCamera.transform.position = client.Target.position);

                        client.RotationRx
                            .TakeWhile(_ => me.SpectatingRx.Value == client)
                            .ObserveOnMainThread()
                            .Subscribe(rot => SpectatorCamera.transform.rotation = client.Target.rotation);
                    }
                });
        }
    }
}

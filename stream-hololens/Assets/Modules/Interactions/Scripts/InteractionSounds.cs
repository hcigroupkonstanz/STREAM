using UnityEngine;
using System.Collections;
using Assets.Modules.Networking;
using Newtonsoft.Json.Linq;
using UniRx;

namespace Assets.Modules.Interactions
{
    [RequireComponent(typeof(AudioSource))]
    public class InteractionSounds : MonoBehaviour
    {
        public AudioClip ButtonPress;
        public AudioClip VoiceCommand;
        private AudioSource _audioSource;

        private void OnEnable()
        {
            WebServerConnection.ServerMessagesAsync
                .TakeUntilDisable(this)
                .Where(p => p.channel == NetworkChannel.CONTROL)
                .Where(p => p.command == "action")
                .ObserveOnMainThread()
                .Subscribe(p => OnUserAction(p.payload));
            _audioSource = GetComponent<AudioSource>();
        }

        private void OnUserAction(JToken data)
        {
            var source = data["source"].Value<string>();
            if (source == "touch")
                _audioSource.PlayOneShot(ButtonPress);
            else if (source == "voice")
                _audioSource.PlayOneShot(VoiceCommand);
            else
                Debug.LogError($"Unknown source: {source}");
        }
    }
}

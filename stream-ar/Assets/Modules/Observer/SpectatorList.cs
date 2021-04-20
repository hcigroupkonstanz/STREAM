using Assets.Modules.ArClients;
using UnityEngine;
using UnityEngine.UI;
using UniRx;
using System.Collections.Generic;
using Assets.Modules.Networking;
using TMPro;

namespace Assets.Modules.Observer
{
    public class SpectatorList : MonoBehaviour
    {
        public Button ButtonTemplate;
        public RectTransform List;
        public Button NoSpectatorButton;
        private Dictionary<ArClient, Button> _arClientButtons = new Dictionary<ArClient, Button>();

        private async void Awake()
        {
            await StreamClient.Instance.Initialized;

            var arclients = (ArClientManager) ArClientManager.Instance;
            await arclients.Initialized;

            foreach (var arclient in arclients.Get())
                AddArClient(arclient);
            ArClient.ModelCreated()
                .TakeUntilDestroy(this)
                .Subscribe(client => AddArClient(client));
            ArClient.ModelDestroyed()
                .TakeUntilDestroy(this)
                .Subscribe(client => RemoveArClient(client));

            StreamClient.Instance.SpectatingRx
                .TakeUntilDestroy(this)
                .Subscribe(client =>
                {
                    if (!client)
                        SetActiveButton(NoSpectatorButton);
                    else if (_arClientButtons.TryGetValue(client, out var button))
                        SetActiveButton(button);
                });
        }

        public void ToggleVisibility()
        {
            gameObject.SetActive(!gameObject.activeSelf);
        }

        public void ResetSpectating()
        {
            StreamClient.Instance.Spectating = null;
            gameObject.SetActive(false);
        }

        private void SetActiveButton(Button btn)
        {
            NoSpectatorButton.GetComponent<Image>().color = Color.white;
            foreach (var other in _arClientButtons.Values)
                other.GetComponent<Image>().color = Color.white;

            btn.GetComponent<Image>().color = Color.green;
            gameObject.SetActive(false);
        }

        private void AddArClient(ArClient client)
        {
            if (!_arClientButtons.ContainsKey(client) && client.Id != StreamClient.Instance.Id)
            {
                var button = Instantiate(ButtonTemplate, List);
                _arClientButtons.Add(client, button);

                button.GetComponentInChildren<TextMeshProUGUI>().text = $"ArClient {client.Name}";
                button.OnClickAsObservable()
                    .TakeUntilDestroy(this)
                    .Subscribe(_ => StreamClient.Instance.Spectating = client);
            }
        }

        private void RemoveArClient(ArClient client)
        {
            if (_arClientButtons.TryGetValue(client, out var button))
            {
                Destroy(button.gameObject);
                _arClientButtons.Remove(client);

                if (StreamClient.Instance.Spectating == client)
                    StreamClient.Instance.Spectating = null;
            }
        }
    }
}

using Assets.Modules.Networking;
using UnityEngine;

public class HUDNetworkStatus : MonoBehaviour
{
    private WebServerConnection _connection;
    private Renderer _renderer;

    private void OnEnable()
    {
        _connection = WebServerConnection.Instance;
        _renderer = GetComponent<Renderer>();
        _renderer.material = Instantiate(_renderer.material);
    }

    private void Update()
    {
        Color color = Color.black;

        switch (_connection.Status)
        {
            case ConnectionStatus.Connected:
                color = Color.green;
                break;

            case ConnectionStatus.Reconnecting:
            case ConnectionStatus.Disconnected:
                color = Color.red;
                break;

            case ConnectionStatus.Connecting:
                color = Color.yellow;
                break;
        }

        _renderer.material.color = color;
    }

    public void ToggleNetworkStatus()
    {
        var child = transform.GetChild(0);
        child.gameObject.SetActive(!child.gameObject.activeSelf);
    }
}

﻿using Assets.Modules.Networking;
using TMPro;
using UnityEngine;
using Vuforia;

namespace Assets.Modules.Observer
{
    public class ObserverController : MonoBehaviour
    {
        public GameObject ServerIpInputContainer;
        public TMP_InputField IpInput;
        public TextMeshProUGUI IpDisplay;
        public GameObject IpButton;
        public GameObject RecalibrateButton;
        public GameObject SpectatorButton;
        public GameObject SpectatorListContainer;

        public UnityEngine.UI.Image HideUiImage;
        public GameObject HideUiText;


        public void ToggleServerIpInput()
        {
            ServerIpInputContainer.SetActive(!ServerIpInputContainer.activeSelf);
        }

        public void ApplyServerIp()
        {
            WebServerAddress.Current = IpInput.text;
        }

        public void Calibrate()
        {
            StreamClient.Instance.IsCalibrating = true;
        }


        private void OnEnable()
        {
            WebServerAddress.OnAdressChange += WebServerAddress_OnAdressChange;
            WebServerAddress_OnAdressChange();
            Debug.Log("Vuforia runtime using " + VuforiaRuntimeUtilities.GetActiveFusionProvider());

            // hide UI by default
            ToggleUi();
        }

        private void OnDisable()
        {
            WebServerAddress.OnAdressChange -= WebServerAddress_OnAdressChange;
        }

        private void WebServerAddress_OnAdressChange()
        {
            IpDisplay.text = "Current IP:" + WebServerAddress.Current;
        }

        public void ToggleUi()
        {
            var buttonsActive = !IpButton.activeSelf;

            ServerIpInputContainer.SetActive(false);
            SpectatorListContainer.SetActive(false);
            IpButton.SetActive(buttonsActive);
            RecalibrateButton.SetActive(buttonsActive);
            HideUiText.SetActive(buttonsActive);
            SpectatorButton.SetActive(buttonsActive);

            if (buttonsActive)
                HideUiImage.color = Color.white;
            else
                HideUiImage.color = new Color(0, 0, 0, 0);
        }
    }
}

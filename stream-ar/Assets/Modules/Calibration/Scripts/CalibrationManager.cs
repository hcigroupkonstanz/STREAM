using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using System.Linq;
using UnityEngine;
using Vuforia;

namespace Assets.Modules.Calibration
{
    public class CalibrationManager : MonoBehaviour
    {
        private StreamClient _streamClient;
        private RoomscaleHololensCalibration _hololensRoomscaleCalibration;
        private LegacyHololensCalibration _hololensSingleCalibration;
        private WebClientCalibration _webClientCalibration;

        private WebClientManager _webClientManager;

        private VuforiaBehaviour _vuforiaBehaviour;

        private void OnEnable()
        {
            _streamClient = StreamClient.Instance;
            _webClientManager = WebClientManager.Instance as WebClientManager;
            _hololensRoomscaleCalibration = FindObjectOfType<RoomscaleHololensCalibration>();
            _hololensSingleCalibration = FindObjectOfType<LegacyHololensCalibration>();
            _webClientCalibration = FindObjectOfType<WebClientCalibration>();
            _vuforiaBehaviour = FindObjectOfType<VuforiaBehaviour>();
        }


        private void Update()
        {
            var isHololensCalibrating = _streamClient.IsCalibrating;
            _hololensRoomscaleCalibration.enabled = isHololensCalibrating;
            _hololensSingleCalibration.enabled = isHololensCalibrating;

            var isTabletCalibrating = _webClientManager.Get().Any(c => c.IsCalibrating);
            _webClientCalibration.enabled = isTabletCalibrating;

            var isVuforiaActive = isHololensCalibrating || isTabletCalibrating;
            _vuforiaBehaviour.enabled = isVuforiaActive;
        }
    }
}

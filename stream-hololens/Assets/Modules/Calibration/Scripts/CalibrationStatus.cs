using TMPro;
using UnityEngine;


namespace Assets.Modules.Calibration
{
    public class CalibrationStatus : MonoBehaviour
    {
        public GameObject HudElement;
        public TextMeshPro PercentText;

        private Calibrator _calibrator;

        private void OnEnable()
        {
            _calibrator = GetComponentInParent<Calibrator>();

            if (!_calibrator)
            {
                Debug.LogError("Unable to find calibrator");
                gameObject.SetActive(false);
            }
        }

        private void Update()
        {
            //HudElement.SetActive(_calibrator.IsTrackingActive);

            //if (_calibrator.IsTrackingActive)
            //{
            //    int progress = Mathf.FloorToInt((_calibrator.CurrentSamples / (float)_calibrator.MaxSamples) * 100f);
            //    PercentText.text = $"{progress}%";
            //}
        }
    }
}

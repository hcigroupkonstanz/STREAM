using UnityEngine;

namespace Assets.Modules.WebClients
{
    [RequireComponent(typeof(WebClient))]
    public class OrientationAssigner : MonoBehaviour
    {
        private WebClient _client;

        [SerializeField] // for debugging
        private float _avgAngle = 0;

        private float AngleThresholdHorizontal = 17f;
        //public float AngleThresholdHorizontalInverted = 170f;

        private float AngleThresholdVerticalMin = 75f;
        //public float AngleThresholdVerticalMax = 110f;

        private void OnEnable()
        {
            _client = GetComponent<WebClient>();
            _avgAngle = Vector3.Angle(Vector3.up, transform.up);
        }

        private void Update()
        {
            var currentAngle = Vector3.Angle(Vector3.up, transform.up);
            _avgAngle = Mathf.Lerp(_avgAngle, currentAngle, 0.07f);

            if (_avgAngle < AngleThresholdHorizontal) // || currentAngle > AngleThresholdHorizontalInverted)
                _client.Orientation = WebClient.ORIENTATION_HORIZONTAL;
            else if (AngleThresholdVerticalMin < _avgAngle) // && _avgAngle < AngleThresholdVerticalMax)
                _client.Orientation = WebClient.ORIENTATION_VERTICAL;
            else
                _client.Orientation = WebClient.ORIENTATION_INBETWEEN;
        }
    }
}

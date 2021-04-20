using System.IO;
using UnityEngine;

namespace Assets.Modules.Plots
{
    [DefaultExecutionOrder(1000)]
    [SelectionBase]
    public class Anchor : MonoBehaviour
    {
        public Transform Buoy;
        [Range(0.01f, 1f)]
        public float Elasticity = 0.5f;

        [Range(0f, 2f)]
        public float PushFactor = 0.5f;

        public bool AffectPosition = true;

        private float _avgHeight = 0f;
        private Transform _cam;

        private void OnEnable()
        {
            _cam = Camera.main.transform;

            if (Buoy && AffectPosition)
            {
                Buoy.transform.position = GetTargetPosition();
                _avgHeight = Buoy.transform.position.y;
            }
            else
            {
                _avgHeight = Buoy.transform.localPosition.y;
            }
        }

        private void Update()
        {
            if (Buoy)
            {
                if (AffectPosition)
                {
                    var e = Mathf.Min(Elasticity * Time.deltaTime * 50f, 0.9f);
                    var targetPos = GetTargetPosition();
                    _avgHeight = e * _avgHeight + (1 - e) * targetPos.y;
                    targetPos.y = _avgHeight;
                    Buoy.transform.position = targetPos;
                }
                else
                {
                    var pos = transform.position;
                    Buoy.transform.position = transform.position + Vector3.up * _avgHeight * transform.localScale.y;
                }

                // keep buoy level (rotation)
                var currentRotation = transform.rotation.eulerAngles;
                Buoy.transform.rotation = Quaternion.Euler(0, currentRotation.y, 0);
            }
        }

        private Vector3 GetTargetPosition()
        {
            // keep buoy afloat
            var currentPos = transform.position;
            var mainCamPos = _cam.position;

            var height = mainCamPos.y;

            // adjust height to where user is looking
            var camAngle = _cam.rotation.eulerAngles.x;
            if (camAngle > 180)
                camAngle -= 360;
            var distX = Mathf.Abs((new Vector2(currentPos.x, currentPos.z) - new Vector2(mainCamPos.x, mainCamPos.z)).magnitude);
            height -= Mathf.Tan(Mathf.Deg2Rad * camAngle) * Mathf.Abs(distX);

            // cannot sink below anchor
            height = Mathf.Max(height, transform.position.y + Buoy.transform.localScale.y);

            // move scatter plot away from user, but only if user is too near
            var moveDirection = mainCamPos - currentPos;
            var moveDir2D = new Vector3(moveDirection.x, 0, moveDirection.z);

            var positionOffset = Vector3.zero;

            const float NEAR_DISTANCE = 1f;
            var isUserNear = Mathf.Abs(moveDir2D.magnitude) <= NEAR_DISTANCE;
            if (isUserNear)
            {
                positionOffset = moveDir2D.normalized * (NEAR_DISTANCE - Mathf.Abs(moveDir2D.magnitude)) * PushFactor;
            }

            return new Vector3(currentPos.x, height, currentPos.z) - positionOffset;
        }
    }
}

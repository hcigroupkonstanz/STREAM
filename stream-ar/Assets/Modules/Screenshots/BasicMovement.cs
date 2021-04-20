using UnityEngine;

namespace Assets.Modules.Core.Util
{
    public class BasicMovement : MonoBehaviour
    {
        public float LookSensitivity = 10f;
        public float MovementSpeed = 0.1f;

        void Update()
        {
            if (Input.GetButton("Fire1") || Input.GetButton("Fire2"))
            {
                transform.RotateAround(transform.position, transform.right, -Input.GetAxis("Mouse Y") * LookSensitivity);
                transform.RotateAround(transform.position, Vector3.up, Input.GetAxis("Mouse X") * LookSensitivity);
            }


            var moveDirection = new Vector3();
            if (Input.GetKey(KeyCode.W))
                moveDirection.z = 1;
            else if (Input.GetKey(KeyCode.S))
                moveDirection.z = -1;

            if (Input.GetKey(KeyCode.D))
                moveDirection.x = 1;
            else if (Input.GetKey(KeyCode.A))
                moveDirection.x = -1;

            if (Input.GetKey(KeyCode.Q))
                moveDirection.y = 1;
            else if (Input.GetKey(KeyCode.E))
                moveDirection.y = -1;

            var speedFactor = MovementSpeed;
            if (Input.GetKey(KeyCode.LeftShift))
                speedFactor *= 5;

            transform.position += transform.TransformDirection(moveDirection) * speedFactor;
        }
    }
}
using UnityEngine;

namespace Assets.Modules.Interactions
{
    public class CursorIndicator : MonoBehaviour
    {
        public Transform Cursor;

        public float MaxDistance = 2f;
        public LayerMask RaycastLayerMask = Physics.DefaultRaycastLayers;

        [Range(0.01f, 1f)]
        public float Weight = 0.1f;


        private float OriginalWidth;

        private void OnEnable()
        {
            OriginalWidth = Cursor.transform.localScale.z;
        }

        private void Update()
        {
            Vector3 targetPosition;

            if (Physics.Raycast(transform.position, transform.forward, out var hit, MaxDistance, RaycastLayerMask))
            {
                targetPosition = hit.point;
                Cursor.transform.LookAt(hit.point + hit.normal);

                var scale = Cursor.transform.localScale;
                Cursor.transform.localScale = new Vector3(scale.x, scale.y, OriginalWidth);
            }
            else
            {
                targetPosition = transform.position + transform.forward * MaxDistance / 2f;

                // make cursor round (assuming .x == .y, and .z is making cursor flat)
                var scale = Cursor.transform.localScale;
                Cursor.transform.localScale = new Vector3(scale.x, scale.y, scale.x);
            }

            Cursor.transform.position = Vector3.Lerp(Cursor.transform.position, targetPosition, Weight);
        }
    }
}

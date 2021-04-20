using UnityEngine;

namespace Assets.Modules.Interactions
{
    public static class InteractionUtil
    {
        public static IInteractable PerformRaycast(Vector3 from, Vector3 direction)
        {
            // 'Interactable' Layer
            int layerMask = 1 << 15;

            RaycastHit hit;
            if (Physics.Raycast(from, direction, out hit, Mathf.Infinity, layerMask))
            {
                var hits = hit.collider?.gameObject?.GetComponentsInParent<IInteractable>();
                if (hits.Length > 0)
                {
                    Debug.DrawRay(from, direction, Color.green);
                    return hits[0];
                }
            }
            else
            {
                Debug.DrawRay(from, direction, Color.red);
            }

            return null;
        }
    }
}

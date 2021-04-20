using UnityEngine;

public static class GizmosExtension
{
    public static void DrawRotation(Vector3 position, Quaternion rotation, float arrowLength)
    {
        var prevColor = Gizmos.color;

        Gizmos.color = Color.red;
        Gizmos.DrawLine(position, position + rotation * Vector3.right * arrowLength);
        Gizmos.color = Color.green;
        Gizmos.DrawLine(position, position + rotation * Vector3.up * arrowLength);
        Gizmos.color = Color.blue;
        Gizmos.DrawLine(position, position + rotation * Vector3.forward * arrowLength);

        Gizmos.color = prevColor;
    }
}

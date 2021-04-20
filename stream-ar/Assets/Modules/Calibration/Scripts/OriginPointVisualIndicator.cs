using Assets.Modules.Core;
using Assets.Modules.Networking;
using UniRx;
using UnityEngine;

public class OriginPointVisualIndicator : MonoBehaviour
{
    private void OnEnable()
    {
        var client = StreamClient.Instance;
        ApplyTransformationMatrix(client);
        client
            .ObserveEveryValueChanged(c => c.OffsetMatrix)
            .TakeUntilDisable(this)
            .Subscribe(_ => ApplyTransformationMatrix(client));

        this
            .ObserveEveryValueChanged(_ => transform.parent.position)
            .TakeUntilDisable(this)
            .Subscribe(_ => ApplyTransformationMatrix(client));
    }

    private void ApplyTransformationMatrix(StreamClient client)
    {
        var matrix = client.OffsetMatrix.inverse;
        var rotOffset = MathUtility.QuaternionFromMatrix(matrix);
        transform.position = MathUtility.PositionFromMatrix(matrix) + rotOffset * transform.parent.localPosition;
        transform.rotation = rotOffset * transform.parent.localRotation;
    }
}

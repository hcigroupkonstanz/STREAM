using Assets.Modules.Core;
using UniRx;

namespace Assets.Modules.Networking
{
    public class OriginCoordinateSystem : SingletonBehaviour<OriginCoordinateSystem>
    {
        private void OnEnable()
        {
            var client = ArtsClient.Instance;
            ApplyTransformationMatrix(client);
            client
                .ObserveEveryValueChanged(c => c.OffsetMatrix)
                .TakeUntilDisable(this)
                .Subscribe(_ => ApplyTransformationMatrix(client));
        }

        private void ApplyTransformationMatrix(ArtsClient client)
        {
            var matrix = client.OffsetMatrix.inverse;
            transform.localPosition = MathUtility.PositionFromMatrix(matrix);
            transform.localRotation = MathUtility.QuaternionFromMatrix(matrix);
        }
    }
}

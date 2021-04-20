using UnityEngine;
using UnityEngine.Rendering;

namespace Assets.Modules.ScatterPlots
{
    // require meshrenderer to determine if object is visible to camera
    [RequireComponent(typeof(MeshRenderer))]
    public class DataRenderer : MonoBehaviour
    {
        public Mesh DataMesh;
        public Material DataMaterial;

        private ComputeBuffer argsBuffer;
        private uint[] args = { 0, 0, 0, 0, 0 };
        private Bounds _bounds = new Bounds(Vector3.zero, new Vector3(100f, 100f, 100f));
        private MaterialPropertyBlock _propBlock;

        private Texture _dataPositionTexture;
        private Texture _dataColorTexture;
        private Texture _dataNullTexture;
        private Texture _dataIndicesTexture;
        private int _dataCount { get => _dataPositionTexture ? _dataPositionTexture.width : 0; }


        void OnEnable()
        {
            argsBuffer = new ComputeBuffer(1, args.Length * sizeof(uint), ComputeBufferType.IndirectArguments);
            _propBlock = new MaterialPropertyBlock();

            if (DataMaterial)
            {
                SetTextures(_dataPositionTexture, _dataNullTexture, _dataIndicesTexture);
                SetColorTexture(_dataColorTexture);
            }

            CreateArgsBuffer();
        }


        void OnDisable()
        {
            if (argsBuffer != null)
                argsBuffer.Release();
            argsBuffer = null;
        }


        void LateUpdate()
        {
            _propBlock.SetMatrix("_localToWorld", transform.localToWorldMatrix);

            // TODO: determine based on renderer
            var isVisible = true;

            if (isVisible && _dataPositionTexture != null)
            {
                Graphics.DrawMeshInstancedIndirect(DataMesh, 0, DataMaterial,
                    _bounds, argsBuffer, 0, _propBlock, ShadowCastingMode.Off,
                    false, 2, null, LightProbeUsage.Off);
            }
        }


        private void CreateArgsBuffer()
        {
            if (argsBuffer != null)
            {
                if (DataMesh)
                {
                    args[0] = (uint)DataMesh.GetIndexCount(0);
                    args[1] = (uint)_dataCount;
                    args[2] = (uint)DataMesh.GetIndexStart(0);
                    args[3] = (uint)DataMesh.GetBaseVertex(0);
                }
                else
                {
                    args[0] = args[1] = args[2] = args[3] = 0;
                }
                argsBuffer.SetData(args);
            }
        }


        public void SetTextures(Texture position, Texture isNull, Texture indices)
        {
            _dataPositionTexture = position;
            _dataNullTexture = isNull;
            _dataIndicesTexture = indices;

            if (_dataPositionTexture != null)
                _propBlock?.SetTexture("_dataPos", _dataPositionTexture);
            if (_dataNullTexture != null)
                _propBlock?.SetTexture("_dataNull", _dataNullTexture);
            if (_dataIndicesTexture != null)
                _propBlock?.SetTexture("_dataIndices", _dataIndicesTexture);
            _propBlock?.SetInt("_dataCount", _dataCount);

            CreateArgsBuffer();
        }

        public void SetColorTexture(Texture color)
        {
            _dataColorTexture = color;

            if (color != null)
                _propBlock?.SetTexture("_dataColor", color);
        }
    }
}

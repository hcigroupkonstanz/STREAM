using UnityEngine;
using UnityEngine.Rendering;

namespace Assets.Modules.GraphLinks
{
    public class LinkRenderer : MonoBehaviour
    {
        public Mesh LineMesh;
        public Material LineMaterial;

        private ComputeBuffer argsBuffer;
        private uint[] args = new uint[5] { 0, 0, 0, 0, 0 };
        private Bounds _bounds = new Bounds(Vector3.zero, new Vector3(100f, 100f, 100f));
        private MaterialPropertyBlock _propBlock;

        public Transform StartAnchor { get; set; }
        public Transform EndAnchor { get; set; }

        private int _lineCount;
        public int LineCount
        {
            get { return _lineCount; }
            set
            {
                _lineCount = value;
                CreateArgsBuffer();
                _propBlock?.SetInt("_lineCount", _lineCount);
            }
        }

        private Texture _positionStartTex;
        public Texture PositionStartTex
        {
            get { return _positionStartTex; }
            set
            {
                _positionStartTex = value;
                _propBlock?.SetTexture("_posStart", _positionStartTex);
            }
        }


        private Texture _positionEndTex;
        public Texture PositionEndTex
        {
            get { return _positionEndTex; }
            set
            {
                _positionEndTex = value;
                _propBlock?.SetTexture("_posEnd", _positionEndTex);
            }
        }


        private Texture _nullStartTex;
        public Texture NullStartTex
        {
            get { return _nullStartTex; }
            set
            {
                _nullStartTex = value;
                _propBlock?.SetTexture("_nullStart", _nullStartTex);
            }
        }


        private Texture _nullEndTex;
        public Texture NullEndTex
        {
            get { return _nullEndTex; }
            set
            {
                _nullEndTex = value;
                _propBlock?.SetTexture("_nullEnd", _nullEndTex);
            }
        }

        private Texture _colorTex;
        public Texture ColorTex
        {
            get { return _colorTex; }
            set
            {
                _colorTex = value;
                _propBlock?.SetTexture("_color", _colorTex);
            }
        }



        private Texture _texIndices;
        public Texture TexIndices
        {
            get => _texIndices;
            set
            {
                if (_texIndices != null)
                    Destroy(_texIndices);

                _texIndices = value;
                _propBlock?.SetTexture("_indices", _texIndices);
            }
        }


        private float _transparency = 1f;
        public float Transparency
        {
            get => _transparency;
            set
            {
                _transparency = value;
                _propBlock?.SetFloat("_transparencyMultiplier", _transparency);
            }
        }


        private void OnEnable()
        {
            argsBuffer = new ComputeBuffer(1, args.Length * sizeof(uint), ComputeBufferType.IndirectArguments);
            _propBlock = new MaterialPropertyBlock();

            if (LineMaterial)
            {
                //_lineMaterial = Instantiate(LineMaterial);
                if (_positionStartTex != null)
                    _propBlock.SetTexture("_posStart", _positionStartTex);
                if (_positionEndTex != null)
                    _propBlock.SetTexture("_posEnd", _positionEndTex);
                if (_colorTex != null)
                    _propBlock.SetTexture("_color", _colorTex);
                if (_texIndices != null)
                    _propBlock.SetTexture("_indices", _texIndices);
                _propBlock.SetInt("_lineCount", _lineCount);
                _propBlock.SetFloat("_transparencyMultiplier", _transparency);
            }

            CreateArgsBuffer();
        }

        private void LateUpdate()
        {
            if (StartAnchor)
                _propBlock.SetMatrix("_startLocalToWorld", StartAnchor.localToWorldMatrix);
            if (EndAnchor)
                _propBlock.SetMatrix("_endLocalToWorld", EndAnchor.localToWorldMatrix);


            // TODO: determine based on renderer
            var isVisible = true;

            if (isVisible && _lineCount > 0 && Transparency > 0)
            {
                Graphics.DrawMeshInstancedIndirect(LineMesh, 0, LineMaterial,
                    _bounds, argsBuffer, 0, _propBlock, ShadowCastingMode.Off,
                    false, 2, null, LightProbeUsage.Off);
            }
        }

        private void OnDisable()
        {
            if (argsBuffer != null)
                argsBuffer.Release();
            argsBuffer = null;
        }

        private void CreateArgsBuffer()
        {
            if (argsBuffer != null)
            {
                if (LineMesh)
                {
                    args[0] = (uint)LineMesh.GetIndexCount(0);
                    args[1] = (uint)_lineCount;
                    args[2] = (uint)LineMesh.GetIndexStart(0);
                    args[3] = (uint)LineMesh.GetBaseVertex(0);
                }
                else
                {
                    args[0] = args[1] = args[2] = args[3] = 0;
                }
                argsBuffer.SetData(args);
            }
        }
    }
}

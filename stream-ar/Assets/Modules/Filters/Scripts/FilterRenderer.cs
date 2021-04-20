using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TriangleNet.Geometry;
using TriangleNet.Meshing;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Filters
{
    [RequireComponent(typeof(MeshFilter), typeof(MeshRenderer), typeof(Filter))]
    public class FilterRenderer : MonoBehaviour
    {
        const float SELECTED_OFFSET = -0.1f;
        public bool IsSelected = false;

        private MeshFilter _meshFilter;
        private Filter _plotFilter;

        private Texture2D _texture;
        private Renderer _renderer;
        private WebClientManager _tablets;
        private MaterialPropertyBlock _propBlock;

        private const float Z_OFFSET_INCREMENT = 0.002f;
        private static float _zOffset = Z_OFFSET_INCREMENT;

        private CancellationTokenSource _currentRenderingCancelSource;

        private void OnEnable()
        {
            _propBlock = new MaterialPropertyBlock();
            _renderer = GetComponent<Renderer>();

            _plotFilter = GetComponent<Filter>();
            _meshFilter = GetComponent<MeshFilter>();
            _tablets = WebClientManager.Instance as WebClientManager;

            // avoid z-fighting for overlapping filters
            _renderer.GetPropertyBlock(_propBlock);
            _propBlock.SetFloat("_randomOffset", _zOffset);
            _renderer.SetPropertyBlock(_propBlock);
            _zOffset += Z_OFFSET_INCREMENT;
            if (_zOffset >= 0.01f)
                _zOffset = Z_OFFSET_INCREMENT;

            _plotFilter.PathRx
                .TakeUntilDisable(this)
                .Where(path => path != null && path.Length > 3)
                .Sample(TimeSpan.FromMilliseconds(100))
                .ObserveOnMainThread()
                .Subscribe(_ => RenderPath(_plotFilter.Path));

            _plotFilter.ColorRx
                .TakeUntilDisable(this)
                .Where(col => !string.IsNullOrEmpty(col))
                .ObserveOnMainThread()
                .Subscribe(col => RenderColor(col));

            _plotFilter.SelectedByRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(val => UpdateSelection());
        }

        private void OnDisable()
        {
            _currentRenderingCancelSource?.Cancel();
            _currentRenderingCancelSource = null;
        }

        private void UpdateSelection()
        {
            _renderer.GetPropertyBlock(_propBlock);
            var user = StreamClient.Instance;
            if (_plotFilter.SelectedBy != null && _plotFilter.SelectedBy.Any(id => _tablets.Get(id)?.Owner == user.Id))
                _propBlock.SetFloat("_isSelectedOffset", 1f);
            else
                _propBlock.SetFloat("_isSelectedOffset", 0f);
            _renderer.SetPropertyBlock(_propBlock);
        }

        private void RenderColor(string filterColor)
        {
            if (_texture)
            {
                Destroy(_texture);
                _texture = null;
            }

            if (filterColor.StartsWith("#"))
            {
                // single colour
                if (ColorUtility.TryParseHtmlString(filterColor, out var color))
                {
                    _texture = new Texture2D(1, 1)
                    {
                        filterMode = FilterMode.Bilinear,
                        wrapMode = TextureWrapMode.Clamp
                    };
                    _texture.SetPixel(0, 0, color);
                    _texture.Apply();
                }
            }
            else if (filterColor.StartsWith("g"))
            {
                // gradient
                var gradientStops = filterColor.Split(':').Skip(1).ToArray();

                _texture = new Texture2D(1, gradientStops.Length)
                {
                    filterMode = FilterMode.Bilinear,
                    wrapMode = TextureWrapMode.Clamp
                };

                for (var i = 0; i < gradientStops.Length; i++)
                {
                    if (ColorUtility.TryParseHtmlString(gradientStops[i], out var color))
                        _texture.SetPixel(0, gradientStops.Length - i - 1, color);
                }
                _texture.Apply();
            }

            if (_texture != null)
            {
                _renderer.GetPropertyBlock(_propBlock);
                _propBlock.SetTexture("_colorTex", _texture);
                _renderer.SetPropertyBlock(_propBlock);
            }
        }


        private async void RenderPath(float[][] path)
        {
            _currentRenderingCancelSource?.Cancel();
            _currentRenderingCancelSource = new CancellationTokenSource();
            var cancelToken = _currentRenderingCancelSource.Token;

            var triangulationTask = Task.Factory.StartNew(() =>
            {
                try
                {
                    cancelToken.ThrowIfCancellationRequested();

                    // triangulate polygon into mesh
                    var polyVertices = new Vertex[path.Length];

                    for (var i = 0; i < path.Length; i++)
                        polyVertices[i] = new Vertex(path[i][0], path[i][1]);

                    cancelToken.ThrowIfCancellationRequested();

                    var polygon = new Polygon();
                    polygon.Add(new Contour(polyVertices));

                    cancelToken.ThrowIfCancellationRequested();

                    var options = new ConstraintOptions { Convex = false, ConformingDelaunay = false };
                    var quality = new QualityOptions { };

                    var result = polygon.Triangulate(options, quality);
                    cancelToken.ThrowIfCancellationRequested();
                    return result;
                }
                catch (Exception e)
                {
                    Debug.LogError(e.Message);
                    return null;
                }
            });

            var generatedMesh = await triangulationTask;

            if (cancelToken.IsCancellationRequested || generatedMesh == null)
                return;

            if (generatedMesh.Triangles.Count == 0)
                return;

            // convert triangulated mesh into unity mesh
            var triangles = new int[generatedMesh.Triangles.Count * 3];
            var vertices = new Vector3[generatedMesh.Triangles.Count * 3];
            var uv = new Vector2[generatedMesh.Triangles.Count * 3];

            var meshTask = Task.Factory.StartNew(() =>
            {
                var counter = 0;
                double minX = generatedMesh.Triangles.First().vertices[0].x;
                double maxX = generatedMesh.Triangles.First().vertices[0].x;
                double minY = generatedMesh.Triangles.First().vertices[0].y;
                double maxY = generatedMesh.Triangles.First().vertices[0].y;

                foreach (var triangle in generatedMesh.Triangles)
                {
                    var vectors = triangle.vertices;
                    foreach (var vertex in vectors)
                    {
                        minX = Math.Min(minX, vertex.x);
                        maxX = Math.Max(maxX, vertex.x);
                        minY = Math.Min(minY, vertex.y);
                        maxY = Math.Max(maxY, vertex.y);
                    }
                }

                var rangeX = maxX - minX;
                var rangeY = maxY - minY;

                foreach (var triangle in generatedMesh.Triangles)
                {
                    if (cancelToken.IsCancellationRequested)
                        return;

                    var vectors = triangle.vertices;
                    triangles[counter + 0] = counter + 0;
                    triangles[counter + 1] = counter + 2;
                    triangles[counter + 2] = counter + 1;

                    vertices[counter + 0] = new Vector3(Convert.ToSingle(vectors[0].x), Convert.ToSingle(vectors[0].y), 0);
                    vertices[counter + 1] = new Vector3(Convert.ToSingle(vectors[1].x), Convert.ToSingle(vectors[1].y), 0);
                    vertices[counter + 2] = new Vector3(Convert.ToSingle(vectors[2].x), Convert.ToSingle(vectors[2].y), 0);

                    uv[counter + 0] = new Vector2(Convert.ToSingle((vectors[0].x - minX) / rangeX), Convert.ToSingle((vectors[0].y - minY) / rangeY));
                    uv[counter + 1] = new Vector2(Convert.ToSingle((vectors[1].x - minX) / rangeX), Convert.ToSingle((vectors[1].y - minY) / rangeY));
                    uv[counter + 2] = new Vector2(Convert.ToSingle((vectors[2].x - minX) / rangeX), Convert.ToSingle((vectors[2].y - minY) / rangeY));

                    counter += 3;
                }
            });

            await meshTask;

            if (cancelToken.IsCancellationRequested)
                return;
            _currentRenderingCancelSource = null;

            var mesh = new Mesh
            {
                vertices = vertices,
                triangles = triangles,
                uv = uv
            };
            mesh.RecalculateBounds();
            _meshFilter.mesh = mesh;
        }
    }
}

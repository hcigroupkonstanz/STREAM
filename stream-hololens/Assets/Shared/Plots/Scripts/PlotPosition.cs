using Assets.Modules.Networking;
using Assets.Modules.WebClients;
using System;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

#if MIDAIR_AR
using static Assets.Modules.Plots.PlotAlignmentCollider;
#endif

namespace Assets.Modules.Plots
{
    [RequireComponent(typeof(Plot)), DefaultExecutionOrder(100)]
    public class PlotPosition : MonoBehaviour
    {
        private Plot _plot;
        private Transform _cam;

#if MIDAIR_TRACKING

        private void OnEnable()
        {
            _plot = GetComponent<Plot>();
            _cam = Camera.main.transform;
        }

        private void Update()
        {
            transform.localPosition = _plot.Position;
            transform.localRotation = Quaternion.Euler(0, _plot.Rotation.eulerAngles.y, 0);
        }

#elif MIDAIR_AR

        [Range(0f, 1f)]
        public float StabilisationWeight = 0.8f;

        public GameObject PositionIndicator;

        private OriginCoordinateSystem _origin;
        private Manager<WebClient> _webClients;
        private WebServerConnection _connection;
        private readonly Quaternion _rotationOffset = Quaternion.Euler(0, 90, 0);

        private WebClient _tablet;
        private ArtsClient _user;
        private const float ANIMATION_WEIGHT = 0.08f;
        private bool _wasPositioning = false;

        public readonly List<Tuple<AlignmentType, Plot>> AvailableAlignments = new List<Tuple<AlignmentType, Plot>>();

        private AlignmentType _lockedAlignment;
        private Plot _lockedAlignmentPlot;

        private Tuple<AlignmentType, Plot> _currentMainAlignment = null;
        private Tuple<AlignmentType, Plot> _currentSecondaryAlignment = null;


        private void OnEnable()
        {
            _cam = Camera.main.transform;
            _plot = GetComponent<Plot>();
            _origin = OriginCoordinateSystem.Instance;
            _webClients = Manager<WebClient>.Instance;
            _connection = WebServerConnection.Instance;
            _user = ArtsClient.Instance;


            WebClient.AllModelChange()
                .TakeUntilDisable(this)
                .Where(ev => ev.ChangedProperties.Contains("Owner"))
                .Subscribe(ev => SearchCurrentWebclient());

            Observable.Merge(WebClient.ModelCreated(), WebClient.ModelDestroyed())
                .TakeUntilDisable(this)
                .Subscribe(m => SearchCurrentWebclient());
            SearchCurrentWebclient();



            _plot.LockedToAxisRx
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(isLocked =>
                {
                    if (isLocked)
                        LockAlignment();
                    else
                        UnlockAlignment();
                });

            _plot.BoundToRx
                .TakeUntilDisable(this)
                .Where(boundTo => boundTo >= 0)
                .Select(_ => _webClients.Get(_plot.BoundTo))
                .Where(client => client != null && client.Owner == _user.Id)
                .ObserveOnMainThread()
                .Subscribe(client =>
                {
                    // TODO: Workaround for newly created scatterplots
                    if (_plot.Position != Vector3.zero || _plot.Rotation != Quaternion.identity)
                        _plot.PositioningOffset = Vector3.Distance(_plot.transform.position, _cam.position);
                    else
                        _plot.Position = _origin.transform.InverseTransformPoint(_cam.position + _cam.forward * _plot.PositioningOffset);

                    _plot.IsPositioning = true;
                    _wasPositioning = true;

                    _plot.ActualPosition = _plot.Position;
                    _plot.ActualRotation = _plot.Rotation;

                    UpdatePosition(client);

                    Observable.EveryFixedUpdate()
                        .TakeUntilDisable(this)
                        .TakeWhile(_ => client != null && client.Id == _plot.BoundTo && client.Owner == _user.Id)
                        .Subscribe(
                            _ => UpdatePosition(client),
                            () => _plot.IsPositioning = false);
                });
        }

        private void OnDisable()
        {
            if (_lockedAlignmentPlot != null)
                UnlockAlignment();

            if (_currentMainAlignment != null)
                DeactivateAlignment(_currentMainAlignment);
            _currentMainAlignment = null;

            if (_currentSecondaryAlignment != null)
                DeactivateAlignment(_currentSecondaryAlignment);
            _currentSecondaryAlignment = null;
        }

        private void Update()
        {
            /*
             *  (De-)Activate alignment lines
             */
            if (_plot.BoundTo != -1)
            {
                Tuple<AlignmentType, Plot> mainAlignment = null;
                Tuple<AlignmentType, Plot> secondaryAlignment = null;

                if (_plot.LockedToAxis)
                {
                    if (_lockedAlignmentPlot)
                        mainAlignment = Tuple.Create(_lockedAlignment, _lockedAlignmentPlot);
                }
                else if (AvailableAlignments.Count > 0)
                {
                    var sortedAlignments = GetSortedAlignments();
                    mainAlignment = sortedAlignments.FirstOrDefault();
                    secondaryAlignment = GetSecondaryAlignment(sortedAlignments, mainAlignment);
                }


                if (!IsEqual(_currentMainAlignment, mainAlignment))
                {
                    if (_currentMainAlignment != null)
                        DeactivateAlignment(_currentMainAlignment);
                    if (mainAlignment != null)
                        ActivateAlignment(mainAlignment);
                    _currentMainAlignment = mainAlignment;
                }

                if (!IsEqual(_currentSecondaryAlignment, secondaryAlignment))
                {
                    if (_currentSecondaryAlignment != null)
                        DeactivateAlignment(_currentSecondaryAlignment);
                    if (secondaryAlignment != null)
                        ActivateAlignment(secondaryAlignment);
                    _currentSecondaryAlignment = secondaryAlignment;
                }
            }
            else
            {
                // deactivate lines, if they were activated previously
                if (_currentMainAlignment != null)
                {
                    DeactivateAlignment(_currentMainAlignment);
                    _currentMainAlignment = null;
                }

                if (_currentSecondaryAlignment != null)
                {
                    DeactivateAlignment(_currentSecondaryAlignment);
                    _currentSecondaryAlignment = null;
                }
            }


            /*
             *  Plot position
             */
            if (_plot.IsPositioning)
            {
                transform.localPosition = _plot.ActualPosition;
                _plot.Visualization.position = _origin.transform.TransformPoint(_plot.Position);

                transform.localRotation = _plot.ActualRotation;
                _plot.Visualization.rotation = Quaternion.Euler(0, (_origin.transform.rotation * _plot.Rotation).eulerAngles.y, 0);
            }
            else
            {
                transform.localRotation = _plot.Rotation;
                var rot = transform.rotation.eulerAngles;
                transform.rotation = Quaternion.Euler(0, rot.y, 0);
                transform.localPosition = _plot.Position;






                if (_wasPositioning)
                {
                    _plot.Visualization.localPosition = Vector3.zero;
                    _plot.Visualization.localRotation = Quaternion.identity;
                    _wasPositioning = false;
                }


                var isTabletVertical = _tablet && _tablet.Orientation == WebClient.ORIENTATION_VERTICAL;
                var isPlotSelected = _user.SelectedType == "plot" && _user.SelectedId == _plot.Id;


                // visualization position (may rotate towards user)
                var currentPosition = _plot.Visualization.position;
                var currentRotation = _plot.Visualization.rotation;

                if (isTabletVertical && isPlotSelected)
                {
                    // rotation
                    _plot.Visualization.LookAt(_cam);

                    if (transform.InverseTransformPoint(_cam.position).z < 0)
                        _plot.Visualization.Rotate(new Vector3(0, 180, 0), Space.Self);
                    // only rotate around Y-axis to keep scatter plot pointing upwards
                    _plot.Visualization.rotation = Quaternion.Euler(0, _plot.Visualization.rotation.eulerAngles.y, 0);

                    // position
                    var direction = (_cam.position - transform.position);
                    direction.y = 0;
                    direction.Normalize();

                    const float pushOffset = 0.2f;
                    // keep plot in place when looking from the front, but push towards user when looking from the side
                    var pushStrength = Mathf.Sin(Vector3.Angle(direction, transform.forward) * Mathf.Deg2Rad);

                    _plot.Visualization.position = transform.position + direction * pushOffset * pushStrength;
                }
                else
                {
                    _plot.Visualization.localPosition = Vector3.zero;
                    _plot.Visualization.localRotation = Quaternion.identity;
                }

                _plot.Visualization.position = Vector3.Lerp(currentPosition, _plot.Visualization.position, ANIMATION_WEIGHT);
                _plot.Visualization.rotation = Quaternion.Lerp(currentRotation, _plot.Visualization.rotation, ANIMATION_WEIGHT);
            }


            // Indicator if visualization has different position than plot (e.g. during alignment)
            PositionIndicator.SetActive(AvailableAlignments.Count > 0 && _plot.IsPositioning);
        }

        private void SearchCurrentWebclient()
        {
            _tablet = _webClients.Get().FirstOrDefault(wc => wc.Owner == _user.Id);
        }



        private bool IsEqual(Tuple<AlignmentType, Plot> t1, Tuple<AlignmentType, Plot> t2)
        {
            if (t1 == null && t2 == null)
                return true;

            if (t1 == null || t2 == null)
                return false;

            // -> t1 != null && t2 != null
            return t1.Item1 == t2.Item1 && t1.Item2 == t2.Item2;
        }

        private void ActivateAlignment(Tuple<AlignmentType, Plot> t)
        {
            if (t != null && t.Item2)
                t.Item2.GetComponentInChildren<AxisAlignmentIndicator>()?.ActivateAlignment(t.Item1);
        }

        private void DeactivateAlignment(Tuple<AlignmentType, Plot> t)
        {
            if (t != null && t.Item2)
                t.Item2.GetComponentInChildren<AxisAlignmentIndicator>()?.DeactivateAlignment(t.Item1);
        }

        private void LockAlignment()
        {
            var mainAlignment = GetSortedAlignments().FirstOrDefault();
            if (mainAlignment != null)
            {
                _lockedAlignment = mainAlignment.Item1;
                _lockedAlignmentPlot = mainAlignment.Item2;

                _lockedAlignmentPlot.GetComponentInChildren<AxisAlignmentIndicator>()?.LockAlignment(_lockedAlignment);
            }
            else
            {
                _lockedAlignment = AlignmentType.Horizontal;
                _lockedAlignmentPlot = null;
            }
        }

        private void UnlockAlignment()
        {
            if (_lockedAlignmentPlot != null)
                _lockedAlignmentPlot.GetComponentInChildren<AxisAlignmentIndicator>()?.UnlockAlignment(_lockedAlignment);

            _lockedAlignment = AlignmentType.Horizontal;
            _lockedAlignmentPlot = null;
        }

        private void UpdatePosition(WebClient webClient)
        {
            // warning: plot and webclients are in different coordinate system than camera! -> must use OriginCoordinateSystem
            var rot = webClient.transform.localEulerAngles;
            _plot.ActualRotation = Quaternion.Inverse(_origin.transform.rotation) * Quaternion.Euler(0, rot.y, 0) * _rotationOffset;

            var posOffset = _plot.PositioningOffset;

            // when locked to axis, offset is disregarded in favour of placing the plot where user is looking
            if (_plot.LockedToAxis && _lockedAlignmentPlot)
            {
                Plane plane;
                switch (_lockedAlignment)
                {
                    case AlignmentType.Horizontal:
                        plane = new Plane(_lockedAlignmentPlot.transform.right, _lockedAlignmentPlot.transform.position);
                        break;
                    case AlignmentType.Vertical:
                        plane = new Plane(_lockedAlignmentPlot.transform.forward, _lockedAlignmentPlot.transform.position);
                        break;
                    case AlignmentType.Side:
                        plane = new Plane(_lockedAlignmentPlot.transform.forward, _lockedAlignmentPlot.transform.position);
                        break;
                    default:
                        Debug.LogError("Unknown alignment");
                        return;
                }

                if (plane.Raycast(new Ray(_cam.position, _cam.forward), out var enter))
                {
                    posOffset = enter;
                    Debug.DrawRay(_cam.position, _cam.forward * enter);
                }
            }


            var newPosition = _cam.position + _cam.forward * posOffset;
            _plot.ActualPosition = Vector3.Lerp(_origin.transform.InverseTransformPoint(newPosition), _plot.ActualPosition, StabilisationWeight);


            if (_plot.LockedToAxis)
            {
                if (_lockedAlignmentPlot)
                {
                    var other = _lockedAlignmentPlot;
                    Vector3 targetPos;
                    var distance = other.transform.InverseTransformPoint(transform.position) * other.transform.localScale.z;

                    switch (_lockedAlignment)
                    {
                        case AlignmentType.Horizontal:
                            targetPos = other.transform.localPosition + other.transform.localRotation * (distance.z * Vector3.forward);
                            break;
                        case AlignmentType.Vertical:
                            targetPos = other.transform.localPosition + other.transform.localRotation * (distance.y * Vector3.up);
                            break;
                        case AlignmentType.Side:
                            targetPos = other.transform.localPosition + other.transform.localRotation * (distance.x * Vector3.right);
                            break;
                        default:
                            targetPos = _plot.Position;
                            break;
                    }


                    _plot.Position = Vector3.Lerp(targetPos, _plot.Position, StabilisationWeight);
                    _plot.Rotation = Quaternion.Lerp(other.Rotation, _plot.Rotation, StabilisationWeight);
                }
                else
                {
                    _plot.Position = Vector3.Lerp(_plot.ActualPosition, _plot.Position, StabilisationWeight);
                    _plot.Rotation = Quaternion.Lerp(_plot.ActualRotation, _plot.Rotation, StabilisationWeight);
                }
            }
            else
            {
                var sortedAlignments = GetSortedAlignments();

                if (sortedAlignments.Length > 0)
                {
                    var mainAlignment = sortedAlignments.First();
                    var mainAlignmentType = mainAlignment.Item1;
                    var other = mainAlignment.Item2;

                    var distance = other.transform.InverseTransformPoint(transform.position) * other.transform.localScale.z;
                    Vector3 targetPos;

                    switch (mainAlignmentType)
                    {
                        case AlignmentType.Horizontal:
                            targetPos = other.transform.localPosition + other.transform.localRotation * (distance.z * Vector3.forward);
                            break;
                        case AlignmentType.Vertical:
                            targetPos = other.transform.localPosition + other.transform.localRotation * (distance.y * Vector3.up);
                            break;
                        case AlignmentType.Side:
                            targetPos = other.transform.localPosition + other.transform.localRotation * (distance.x * Vector3.right);
                            break;
                        default:
                            targetPos = _plot.Position;
                            break;
                    }



                    // get next alignment plot that has different alignment type than main alignment
                    var nextAlignment = GetSecondaryAlignment(sortedAlignments, mainAlignment);
                    if (nextAlignment != null)
                    {
                        var nextOtherPos = nextAlignment.Item2.transform.localPosition;
                        var targetPosWorld = _origin.transform.TransformPoint(targetPos);
                        var nextTargetLocalPos = nextAlignment.Item2.transform.InverseTransformPoint(targetPosWorld);

                        switch (nextAlignment.Item1)
                        {
                            case AlignmentType.Horizontal:
                                if (mainAlignmentType == AlignmentType.Side)
                                    targetPos = nextAlignment.Item2.transform.TransformPoint(new Vector3(0, nextTargetLocalPos.y, nextTargetLocalPos.z));
                                if (mainAlignmentType == AlignmentType.Vertical)
                                    targetPos = nextAlignment.Item2.transform.TransformPoint(new Vector3(nextTargetLocalPos.x, 0, nextTargetLocalPos.z));
                                break;
                            case AlignmentType.Vertical:
                                if (mainAlignmentType == AlignmentType.Horizontal)
                                    targetPos = nextAlignment.Item2.transform.TransformPoint(new Vector3(nextTargetLocalPos.x, nextTargetLocalPos.y, 0));
                                if (mainAlignmentType == AlignmentType.Side)
                                    targetPos = nextAlignment.Item2.transform.TransformPoint(new Vector3(0, nextTargetLocalPos.y, nextTargetLocalPos.z));
                                break;
                            case AlignmentType.Side:
                                if (mainAlignmentType == AlignmentType.Horizontal)
                                    targetPos = nextAlignment.Item2.transform.TransformPoint(new Vector3(nextTargetLocalPos.x, nextTargetLocalPos.y, 0));
                                if (mainAlignmentType == AlignmentType.Vertical)
                                    targetPos = nextAlignment.Item2.transform.TransformPoint(new Vector3(nextTargetLocalPos.x, 0, nextTargetLocalPos.z));
                                break;
                        }

                        // back to origin coordinate system
                        targetPos = _origin.transform.InverseTransformPoint(targetPos);
                    }



                    _plot.Position = Vector3.Lerp(targetPos, _plot.Position, StabilisationWeight);
                    _plot.Rotation = Quaternion.Lerp(other.Rotation, _plot.Rotation, StabilisationWeight);
                }
                else
                {
                    _plot.Position = Vector3.Lerp(_plot.ActualPosition, _plot.Position, StabilisationWeight);
                    _plot.Rotation = Quaternion.Lerp(_plot.ActualRotation, _plot.Rotation, StabilisationWeight);
                }

            }

            Update();
        }


        private Tuple<AlignmentType, Plot>[] GetSortedAlignments()
        {
            var filteredAlignments = AvailableAlignments.Where(t => t.Item2.BoundTo == -1);
            if (filteredAlignments.Count() == 0)
                return new Tuple<AlignmentType, Plot>[0];
            return filteredAlignments.OrderBy(t => (t.Item2.transform.position - transform.position).sqrMagnitude).ToArray();

        }

        private Tuple<AlignmentType, Plot> GetSecondaryAlignment(IEnumerable<Tuple<AlignmentType, Plot>> sortedAlignments, Tuple<AlignmentType, Plot> mainAlignment)
        {
            return sortedAlignments.FirstOrDefault(t => t.Item1 != mainAlignment.Item1 && t.Item2 != mainAlignment.Item2);
        }
#endif
    }
}

using UnityEngine;
//using Vuforia;

namespace Assets.Modules.Calibration
{
    public abstract class Calibrator : MonoBehaviour
    {
        protected virtual void OnEnable()
        {
        }

        protected virtual void OnDisable()
        {
        }

    }

    //[RequireComponent(typeof(TrackableBehaviour))]
    //public abstract class Calibrator : MonoBehaviour, ITrackableEventHandler
    //{
    //    public int MaxSamples { get; protected set; } = 100;
    //    public int CurrentSamples { get; protected set; } = 0;

    //    public bool IsTrackingActive { get; private set; } = false;

    //    // see: https://stackoverflow.com/a/42717593/4090817
    //    private TrackableBehaviour _trackableBehaviour;

    //    protected virtual void OnEnable()
    //    {
    //        _trackableBehaviour = GetComponent<TrackableBehaviour>();
    //        _trackableBehaviour.RegisterTrackableEventHandler(this);
    //    }

    //    protected virtual void OnDisable()
    //    {
    //        _trackableBehaviour.UnregisterTrackableEventHandler(this);
    //    }


    //    public void OnTrackableStateChanged(TrackableBehaviour.Status previousStatus, TrackableBehaviour.Status newStatus)
    //    {
    //        IsTrackingActive = (newStatus == TrackableBehaviour.Status.DETECTED || newStatus == TrackableBehaviour.Status.TRACKED);
    //    }

    //}
}

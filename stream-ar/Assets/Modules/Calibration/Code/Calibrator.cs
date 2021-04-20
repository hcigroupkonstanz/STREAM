using UnityEngine;
using Vuforia;

namespace Assets.Modules.Calibration
{
    [RequireComponent(typeof(TrackableBehaviour))]
    public abstract class Calibrator : DefaultTrackableEventHandler
    {
        public int MaxSamples { get; protected set; } = 100;
        public int CurrentSamples { get; protected set; } = 0;

        public bool IsTrackingActive { get; private set; } = false;

        // see: https://stackoverflow.com/a/42717593/4090817
        private TrackableBehaviour _trackableBehaviour;

        protected virtual void OnEnable()
        {
            _trackableBehaviour = GetComponent<TrackableBehaviour>();
            _trackableBehaviour.RegisterOnTrackableStatusChanged(OnTrackableStateChanged);
        }

        protected virtual void OnDisable()
        {
            _trackableBehaviour.UnregisterOnTrackableStatusChanged(OnTrackableStateChanged);
        }


        public void OnTrackableStateChanged(TrackableBehaviour.StatusChangeResult state)
        {
            IsTrackingActive = (state.NewStatus == TrackableBehaviour.Status.DETECTED || state.NewStatus == TrackableBehaviour.Status.TRACKED);
        }

    }
}

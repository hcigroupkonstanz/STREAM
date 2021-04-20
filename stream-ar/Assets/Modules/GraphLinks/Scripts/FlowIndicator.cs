using UniRx;
using UnityEngine;

namespace Assets.Modules.GraphLinks
{
    [RequireComponent(typeof(ParticleSystem))]
    public class FlowIndicator : MonoBehaviour
    {
        public float ParticleSpeed = 10f;
        public LinkRenderer LinkRenderer;

        private ParticleSystem _particles;

        private Vector3 LocalPositionOffset = new Vector3(0, -0.6f, 0);

        private void Awake()
        {
            _particles = GetComponent<ParticleSystem>();

            if (!LinkRenderer || !_particles || !gameObject)
            {
                Debug.LogError("Unable to find LinkRenderer in parent, disabling particles");
                enabled = false;
            }
            else
            {
                var pMain = _particles.main;
                pMain.startSpeed = ParticleSpeed;

                Observable.Merge(
                    this.ObserveEveryValueChanged(_ => LinkRenderer?.StartAnchor?.position),
                    this.ObserveEveryValueChanged(_ => LinkRenderer?.EndAnchor?.position)
                )
                    .TakeUntilDestroy(this)
                    .Subscribe(_ => UpdateParticles());
                UpdateParticles();
            }
        }

        private void UpdateParticles()
        {
            if (LinkRenderer.StartAnchor && LinkRenderer.EndAnchor)
            {
                transform.position = LinkRenderer.StartAnchor.TransformPoint(LocalPositionOffset);
                transform.LookAt(LinkRenderer.EndAnchor.TransformPoint(LocalPositionOffset));
                var pMain = _particles.main;
                pMain.startLifetime = Mathf.Abs((LinkRenderer.StartAnchor.position - LinkRenderer.EndAnchor.position).magnitude) / (transform.localScale.x * ParticleSpeed);
            }

            if (_particles)
            {
                var emission = _particles.emission;
                emission.enabled = LinkRenderer.StartAnchor && LinkRenderer.EndAnchor;
            }
        }
    }
}

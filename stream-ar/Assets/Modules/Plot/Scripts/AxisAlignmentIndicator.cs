using UniRx;
using UnityEngine;
using static Assets.Modules.Plots.PlotAlignmentCollider;

namespace Assets.Modules.Plots
{
    public class AxisAlignmentIndicator : MonoBehaviour
    {
        public GameObject AlignmentLinesHorizontal;
        public GameObject AlignmentLinesVertical;
        public GameObject AlignmentLinesSide;

        public Material DefaultMaterial;
        public Material LockedMaterial;

        private readonly ReactiveProperty<int> HorizontalAlignmentActive = new ReactiveProperty<int>(0);
        private readonly ReactiveProperty<int> VerticalAlignmentActive = new ReactiveProperty<int>(0);
        private readonly ReactiveProperty<int> SideAlignmentActive = new ReactiveProperty<int>(0);

        private readonly ReactiveProperty<int> HorizontalAlignmentLocked = new ReactiveProperty<int>(0);
        private readonly ReactiveProperty<int> VerticalAlignmentLocked = new ReactiveProperty<int>(0);
        private readonly ReactiveProperty<int> SideAlignmentLocked = new ReactiveProperty<int>(0);

        private void OnEnable()
        {
            HorizontalAlignmentActive
                .TakeUntilDisable(this)
                .Subscribe(v => AlignmentLinesHorizontal.SetActive(v > 0));
            VerticalAlignmentActive
                .TakeUntilDisable(this)
                .Subscribe(v => AlignmentLinesVertical.SetActive(v > 0));
            SideAlignmentActive
                .TakeUntilDisable(this)
                .Subscribe(v => AlignmentLinesSide.SetActive(v > 0));

            var horizontalLength = AlignmentLinesHorizontal.transform.localScale.z;
            var verticalLength = AlignmentLinesVertical.transform.localScale.y;
            var sideLength = AlignmentLinesSide.transform.localScale.x;

            HorizontalAlignmentLocked
                .TakeUntilDisable(this)
                .Subscribe(v => {
                    AlignmentLinesHorizontal.transform.localScale = new Vector3(1, 1, v > 0 ? 100 : horizontalLength);
                    foreach (var renderer in GetComponentsInChildren<Renderer>(true))
                        renderer.material = v > 0 ? LockedMaterial : DefaultMaterial;
                });

            VerticalAlignmentLocked
                .TakeUntilDisable(this)
                .Subscribe(v =>
                {
                    AlignmentLinesVertical.transform.localScale = new Vector3(1, v > 0 ? 100 : verticalLength, 1);
                    foreach (var renderer in GetComponentsInChildren<Renderer>(true))
                        renderer.material = v > 0 ? LockedMaterial : DefaultMaterial;
                });

            SideAlignmentLocked
                .TakeUntilDisable(this)
                .Subscribe(v =>
                {
                    AlignmentLinesSide.transform.localScale = new Vector3(v > 0 ? 100 : sideLength, 1, 1);
                    foreach (var renderer in GetComponentsInChildren<Renderer>(true))
                        renderer.material = v > 0 ? LockedMaterial : DefaultMaterial;
                });
        }

        private void OnDisable()
        {
            HorizontalAlignmentActive.Value = 0;
            VerticalAlignmentActive.Value = 0;
            SideAlignmentActive.Value = 0;

            HorizontalAlignmentLocked.Value = 0;
            VerticalAlignmentLocked.Value = 0;
            SideAlignmentLocked.Value = 0;
        }

        public void ActivateAlignment(AlignmentType alignmentType)
        {
            switch (alignmentType)
            {
                case AlignmentType.Horizontal:
                    HorizontalAlignmentActive.Value++;
                    break;
                case AlignmentType.Vertical:
                    VerticalAlignmentActive.Value++;
                    break;
                case AlignmentType.Side:
                    SideAlignmentActive.Value++;
                    break;
            }
        }

        public void DeactivateAlignment(AlignmentType alignmentType)
        {
            switch (alignmentType)
            {
                case AlignmentType.Horizontal:
                    HorizontalAlignmentActive.Value = Mathf.Max(0, HorizontalAlignmentActive.Value - 1);
                    break;
                case AlignmentType.Vertical:
                    VerticalAlignmentActive.Value = Mathf.Max(0, VerticalAlignmentActive.Value - 1);
                    break;
                case AlignmentType.Side:
                    SideAlignmentActive.Value = Mathf.Max(0, SideAlignmentActive.Value - 1);
                    break;
            }
        }


        public void LockAlignment(AlignmentType alignmentType)
        {
            switch (alignmentType)
            {
                case AlignmentType.Horizontal:
                    HorizontalAlignmentLocked.Value++;
                    break;
                case AlignmentType.Vertical:
                    VerticalAlignmentLocked.Value++;
                    break;
                case AlignmentType.Side:
                    SideAlignmentLocked.Value++;
                    break;
            }
        }

        public void UnlockAlignment(AlignmentType alignmentType)
        {
            switch (alignmentType)
            {
                case AlignmentType.Horizontal:
                    HorizontalAlignmentLocked.Value = Mathf.Max(0, HorizontalAlignmentLocked.Value - 1);
                    break;
                case AlignmentType.Vertical:
                    VerticalAlignmentLocked.Value = Mathf.Max(0, VerticalAlignmentLocked.Value - 1);
                    break;
                case AlignmentType.Side:
                    SideAlignmentLocked.Value = Mathf.Max(0, SideAlignmentLocked.Value - 1);
                    break;
            }
        }
    }
}

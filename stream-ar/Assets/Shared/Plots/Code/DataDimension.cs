namespace Assets.Modules.Plots
{
    public class DataDimension
    {
        public struct Tick
        {
            public string Name;
            public float Value;
        }

        public string Column { get; set; }
        public string DisplayName { get; set; }
        public Tick[] Ticks { get; set; }
        public bool HideTicks { get; set; }
    }
}

/** Tiny dependency-free SVG charts (server-renderable). */

type Point = { label: string; value: number };

const fmtDay = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export function BarChart({ data, height = 140 }: { data: Point[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / data.length;
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="DMs sent per day">
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 18);
          return (
            <g key={d.label}>
              <title>{`${fmtDay(d.label)}: ${d.value}`}</title>
              <rect x={i * w + w * 0.18} y={height - h} width={w * 0.64} height={Math.max(h, d.value ? 2 : 0.6)} rx={1} fill="var(--chart)" opacity={d.value ? 1 : 0.25} />
            </g>
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{fmtDay(data[0]?.label)}</span>
        <span>{fmtDay(data[data.length - 1]?.label)}</span>
      </div>
    </div>
  );
}

export function LineChart({ data, height = 140 }: { data: Point[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div className="grid place-items-center text-sm text-muted text-center px-6" style={{ height }}>
        Follower history fills in day by day (one reading per day).
      </div>
    );
  }
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = Math.max(1, max - min);
  const pad = 10;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = pad + (1 - (d.value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label="Followers over time">
        <path d={`${line} L100,${height} L0,${height} Z`} fill="var(--chart-2)" opacity={0.12} />
        <path d={line} fill="none" stroke="var(--chart-2)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{fmtDay(data[0].label)} · {data[0].value.toLocaleString()}</span>
        <span>{fmtDay(data[data.length - 1].label)} · {data[data.length - 1].value.toLocaleString()}</span>
      </div>
    </div>
  );
}

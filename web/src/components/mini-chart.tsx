/**
 * Tiny pure-SVG charts. No library.
 * Used only on Home and Case Overview.
 */

export function BarMiniChart({
  data,
  height = 120,
  color = "#0F5132",
  labelKey = "label",
  valueKey = "value",
}: {
  data: Array<Record<string, number | string>>;
  height?: number;
  color?: string;
  labelKey?: string;
  valueKey?: string;
}) {
  if (data.length === 0) return null;
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  const barW = 40;
  const gap = 20;
  const padding = { top: 12, bottom: 32, left: 12, right: 12 };
  const width = padding.left + padding.right + data.length * barW + (data.length - 1) * gap;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMinYMid meet"
    >
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const h = ((height - padding.top - padding.bottom) * v) / max;
        const x = padding.left + i * (barW + gap);
        const y = height - padding.bottom - h;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize="11"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="600"
              fill="#1C1C1A"
            >
              {v}
            </text>
            <text
              x={x + barW / 2}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              fontSize="10"
              fontFamily="Inter, system-ui, sans-serif"
              fill="#6B6B65"
            >
              {String(d[labelKey])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DonutMiniChart({
  segments,
  size = 120,
  thickness = 16,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: size }}>
        No data
      </div>
    );
  }
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="inline-flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="transparent" stroke="#E4E0D6" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const len = frac * circumference;
          const circle = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += len;
          return circle;
        })}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size / 6}
          fontWeight="700"
          fontFamily="Inter"
          fill="#1C1C1A"
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-1 text-xs">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-medium tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

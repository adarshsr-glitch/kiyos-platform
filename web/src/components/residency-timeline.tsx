"use client";

type Segment = {
  year: string;         // "2024-25"
  status: "NR" | "RNOR" | "ROR";
  note?: string;
};

const COLORS = {
  NR:   { bg: "#DBEAFE", bar: "#1E3A8A", label: "Non-resident" },
  RNOR: { bg: "#DCFCE7", bar: "#065F46", label: "Resident, not ordinarily resident" },
  ROR:  { bg: "#FEF3C7", bar: "#92400E", label: "Resident, ordinarily resident" },
};

export function ResidencyTimeline({
  segments,
  arrival,
}: {
  segments: Segment[];
  arrival?: string;
}) {
  if (segments.length === 0) return null;

  const colW = 86;
  const rowH = 70;
  const padding = { top: 32, right: 16, bottom: 36, left: 16 };
  const width = padding.left + padding.right + colW * segments.length;
  const height = padding.top + padding.bottom + rowH;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        role="img"
        aria-label="Residency timeline"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="min-w-full"
      >
        {segments.map((s, i) => {
          const x = padding.left + i * colW;
          const c = COLORS[s.status];
          return (
            <g key={i}>
              <rect
                x={x + 4}
                y={padding.top}
                width={colW - 8}
                height={rowH}
                rx={6}
                fill={c.bg}
              />
              <rect
                x={x + 4}
                y={padding.top + rowH - 6}
                width={colW - 8}
                height={6}
                rx={3}
                fill={c.bar}
              />
              <text
                x={x + colW / 2}
                y={padding.top + rowH / 2 - 4}
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
                fontSize="14"
                fontWeight="600"
                fill="#1C1C1A"
              >
                {s.status}
              </text>
              {s.note && (
                <text
                  x={x + colW / 2}
                  y={padding.top + rowH / 2 + 14}
                  textAnchor="middle"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontSize="9"
                  fill="#6B6B65"
                >
                  {s.note}
                </text>
              )}
              <text
                x={x + colW / 2}
                y={padding.top + rowH + 20}
                textAnchor="middle"
                fontFamily="Inter, system-ui, sans-serif"
                fontSize="10"
                fill="#6B6B65"
              >
                {s.year}
              </text>
              {arrival === s.year && (
                <g>
                  <line
                    x1={x + colW / 2}
                    y1={padding.top - 10}
                    x2={x + colW / 2}
                    y2={padding.top}
                    stroke="#0F5132"
                    strokeWidth="2"
                  />
                  <text
                    x={x + colW / 2}
                    y={padding.top - 14}
                    textAnchor="middle"
                    fontFamily="Inter"
                    fontSize="10"
                    fontWeight="600"
                    fill="#0F5132"
                  >
                    Arrival
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
        {(["NR", "RNOR", "ROR"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-2 w-3 rounded"
              style={{ background: COLORS[k].bar }}
            />
            <span className="font-medium">{k}</span>
            <span>— {COLORS[k].label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

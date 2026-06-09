import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs"
      style={{ background: 'rgba(10,15,35,0.95)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p className="font-bold text-white/60 mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color || '#f97316' }}>
          {p.name}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  );
}

/* Gradient stops for bars — high scores green, low scores orange/red */
function barColour(value) {
  if (value >= 75) return '#22c55e';
  if (value >= 50) return '#f97316';
  return '#ef4444';
}

export default function PerformanceOverviewChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-white/30">No performance data available.</p>
      </div>
    );
  }

  /* normalise keys from both /admin/platform-analytics (avg_marks) and legacy (average_marks) */
  const chartData = data.slice(0, 10).map(r => ({
    subject: r.subject,
    'Avg Marks': Number(r.avg_marks ?? r.average_marks ?? 0),
  }));

  const axisProps = { stroke: 'rgba(255,255,255,0.15)', tick: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } };

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
      <BarChart
        data={chartData}
        layout="vertical"
        barCategoryGap="20%"
        style={{ fontFamily: 'inherit' }}
      >
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} />
        <YAxis type="category" dataKey="subject" width={130} {...axisProps} />
        <Tooltip content={<GlassTooltip />} />
        <Bar dataKey="Avg Marks" radius={[0, 4, 4, 0]}
          label={{ position: 'right', fill: 'rgba(255,255,255,0.45)', fontSize: 10, formatter: v => `${v}%` }}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={barColour(entry['Avg Marks'])} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

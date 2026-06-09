import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs"
      style={{ background: 'rgba(10,15,35,0.95)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p className="font-bold text-white/60 mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>GH₵ {Number(p.value || 0).toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
}

export default function FeeCollectionChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-white/30">No fee collection data yet.</p>
      </div>
    );
  }

  /* normalise keys from /admin/platform-analytics */
  const chartData = data.map(r => ({
    month:     r.month,
    Collected: Number(r.collected || 0),
    Pending:   Number(r.pending   || 0),
    Overdue:   Number(r.overdue   || 0),
  }));

  const axisProps = { stroke: 'rgba(255,255,255,0.15)', tick: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barGap={4} barCategoryGap="30%"
        style={{ fontFamily: 'inherit' }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip content={<GlassTooltip />} />
        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
        <Bar dataKey="Collected" fill="#22c55e" radius={[4,4,0,0]} />
        <Bar dataKey="Pending"   fill="#f59e0b" radius={[4,4,0,0]} />
        <Bar dataKey="Overdue"   fill="#ef4444" radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

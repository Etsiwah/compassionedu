import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-xs"
      style={{ background: 'rgba(10,15,35,0.95)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p className="font-bold text-white/60 mb-1.5">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}%</strong>
        </p>
      ))}
    </div>
  );
}

export default function AttendanceAnalyticsChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-white/30">No attendance analytics available.</p>
      </div>
    );
  }

  /* normalise: data comes from /admin/platform-analytics as { month, present, absent, late, total } */
  const chartData = data.map(r => ({
    month: r.month,
    'Attendance %': r.total > 0
      ? Math.round((Number(r.present) / Number(r.total)) * 100)
      : (r.average_percentage != null ? Number(r.average_percentage) : 0),
  }));

  const axisProps = { stroke: 'rgba(255,255,255,0.15)', tick: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} style={{ fontFamily: 'inherit' }}>
        <defs>
          <linearGradient id="attendGradMain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f97316" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis domain={[0, 100]} unit="%" {...axisProps} />
        <Tooltip content={<GlassTooltip />} />
        <Area
          type="monotone"
          dataKey="Attendance %"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#attendGradMain)"
          dot={{ fill: '#f97316', r: 4 }}
          activeDot={{ r: 6, fill: '#fb923c' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Renders a simple monthly attendance calendar.
 * records: [{ date: 'YYYY-MM-DD', status: 'present'|'absent'|'late' }]
 */
const STATUS_STYLE = {
  present: 'bg-green-400 text-white',
  absent:  'bg-red-400 text-white',
  late:    'bg-yellow-400 text-white',
};

export default function AttendanceCalendar({ records = [], month }) {
  // Build a map of date → status
  const map = {};
  records.forEach(r => { map[r.date] = r.status; });

  // Determine days in the month
  const [year, mon] = (month || new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstDay = new Date(year, mon - 1, 1).getDay(); // 0=Sun

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) => `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <span key={`e-${i}`} />;
          const status = map[dateStr(d)];
          return (
            <span
              key={d}
              title={status || 'no record'}
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs mx-auto
                ${status ? STATUS_STYLE[status] : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
            >
              {d}
            </span>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 text-xs text-gray-500">
        <span><span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-1" />Present</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-red-400 mr-1" />Absent</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-1" />Late</span>
      </div>
    </div>
  );
}

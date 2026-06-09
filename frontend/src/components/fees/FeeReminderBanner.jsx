export default function FeeReminderBanner({ fees }) {
  const upcoming = fees.filter(f => {
    if (f.status !== 'pending') return false;
    const due = new Date(f.due_date);
    const diff = (due - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });
  if (!upcoming.length) return null;
  return (
    <div role="alert" className="bg-yellow-50 border border-yellow-300 text-yellow-800 rounded-lg p-3 text-sm mb-4">
      ⚠️ You have {upcoming.length} fee payment{upcoming.length > 1 ? 's' : ''} due within 7 days.
    </div>
  );
}

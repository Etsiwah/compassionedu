export default function PaymentHistoryTable({ payments }) {
  if (!payments?.length) return <p className="text-sm text-gray-500">No payments recorded.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700 text-left">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Receipt Ref</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} className="border-t border-gray-200 dark:border-gray-600">
              <td className="px-3 py-2">{new Date(p.paid_at).toLocaleDateString()}</td>
              <td className="px-3 py-2">R {Number(p.amount_paid).toFixed(2)}</td>
              <td className="px-3 py-2">{p.receipt_ref || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

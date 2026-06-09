const gradeColor = { A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600', D: 'text-orange-600', F: 'text-red-600' };

export default function ResultsTable({ results }) {
  if (!results?.length) return <p className="text-sm text-gray-500">No results found.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700 text-left">
            <th className="px-3 py-2">Subject</th>
            <th className="px-3 py-2">Term</th>
            <th className="px-3 py-2">Marks</th>
            <th className="px-3 py-2">Grade</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.id} className="border-t border-gray-200 dark:border-gray-600">
              <td className="px-3 py-2">{r.subject}</td>
              <td className="px-3 py-2">{r.term}</td>
              <td className="px-3 py-2">{Number(r.marks).toFixed(1)}</td>
              <td className={`px-3 py-2 font-bold ${gradeColor[r.grade] || ''}`}>{r.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

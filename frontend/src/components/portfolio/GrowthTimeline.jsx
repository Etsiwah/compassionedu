/**
 * Renders experiences sorted by start_date ascending as a vertical timeline.
 * Requirements: 7.5
 */
export default function GrowthTimeline({ experiences = [] }) {
  if (!experiences.length) return <p className="text-sm text-gray-500">No experiences added yet.</p>;

  // Ensure chronological order (ascending start_date)
  const sorted = [...experiences].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return (
    <ol className="relative border-l border-orange-300 dark:border-orange-700 ml-3">
      {sorted.map(exp => (
        <li key={exp.id} className="mb-6 ml-4">
          <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-orange-500 border-2 border-white dark:border-gray-900" />
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(exp.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
            {exp.end_date && ` – ${new Date(exp.end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}`}
          </p>
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{exp.title}</h4>
          {exp.organization && <p className="text-xs text-orange-500">{exp.organization}</p>}
          {exp.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exp.description}</p>}
        </li>
      ))}
    </ol>
  );
}

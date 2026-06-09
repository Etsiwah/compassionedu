const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ProjectsGallery({ media = [] }) {
  if (!media.length) return <p className="text-sm text-gray-500">No project media uploaded yet.</p>;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {media.map(item => (
        <div key={item.id} className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 shadow">
          {IMAGE_MIMES.includes(item.mime_type) ? (
            <img src={item.url} alt={item.title || 'Project media'} className="w-full h-32 object-cover" />
          ) : (
            <div className="flex items-center justify-center h-32 text-3xl">🎬</div>
          )}
          {item.title && (
            <p className="text-xs text-gray-600 dark:text-gray-300 px-2 py-1 truncate">{item.title}</p>
          )}
        </div>
      ))}
    </div>
  );
}

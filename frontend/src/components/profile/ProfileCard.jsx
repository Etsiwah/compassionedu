export default function ProfileCard({ profile }) {
  if (!profile) return null;
  const { name, email, role, phone, address, photo_url } = profile;
  return (
    <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <img
        src={photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=f97316&color=fff`}
        alt={`${name} profile`}
        className="w-16 h-16 rounded-full object-cover"
      />
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-100">{name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{email}</p>
        <p className="text-xs text-orange-500 capitalize">{role}</p>
        {phone && <p className="text-xs text-gray-500">{phone}</p>}
        {address && <p className="text-xs text-gray-500">{address}</p>}
      </div>
    </div>
  );
}

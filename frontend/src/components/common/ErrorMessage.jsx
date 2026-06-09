export default function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-4 text-sm">
      {message}
    </div>
  );
}

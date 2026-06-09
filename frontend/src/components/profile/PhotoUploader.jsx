import { useRef, useState } from 'react';
import api from '../../utils/api';

export default function PhotoUploader({ studentId, onUploaded }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      await api.post(`/profile/${studentId}/photos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => inputRef.current.click()}
        disabled={uploading}
        className="text-sm text-orange-500 hover:underline disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '📷 Upload photo'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
        aria-label="Upload profile photo"
      />
    </div>
  );
}

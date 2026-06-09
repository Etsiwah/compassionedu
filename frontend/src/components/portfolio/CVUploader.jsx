import { useRef, useState } from 'react';
import api from '../../utils/api';

export default function CVUploader({ studentId, currentCvUrl, onUploaded }) {
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
      form.append('cv', file);
      await api.post(`/portfolio/${studentId}/cv`, form, {
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
    <div className="flex flex-col gap-2">
      {currentCvUrl && (
        <a href={currentCvUrl} target="_blank" rel="noreferrer" className="text-sm text-orange-500 hover:underline">
          📄 View current CV
        </a>
      )}
      <button
        onClick={() => inputRef.current.click()}
        disabled={uploading}
        className="text-sm text-orange-500 hover:underline disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : '⬆️ Upload CV (PDF/DOCX, max 50MB)'}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleChange}
        aria-label="Upload CV"
      />
    </div>
  );
}

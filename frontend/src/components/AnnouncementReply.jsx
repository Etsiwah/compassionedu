import { useState } from 'react';
import api from '../utils/api';

export default function AnnouncementReply({ announcementId, onSuccess }) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      await api.post(`/announcements/${announcementId}/replies`, {
        reply_message: message
      });
      setMessage('');
      setShowForm(false);
      if (onSuccess) onSuccess();
      
      // Show success feedback
      alert('Reply submitted successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to submit reply';
      setError(errorMsg);
      console.error('Reply submission error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    setShowForm(false);
    setMessage('');
    setError('');
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
        style={{ background:'#f97316', boxShadow:'0 2px 8px rgba(249,115,22,0.3)' }}>
        💬 Reply
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl p-4"
      style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}>
      {error && (
        <div className="mb-3 rounded-lg p-2 text-sm text-red-300"
          style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
          {error}
        </div>
      )}
      
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Type your reply..."
        required
        rows={3}
        className="w-full px-3 py-2 rounded-lg text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60 mb-2"
        style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}
        disabled={submitting}
      />
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
          style={{ background:'#f97316', boxShadow:'0 2px 8px rgba(249,115,22,0.3)' }}>
          {submitting ? 'Sending...' : '📤 Submit Reply'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white/70 border border-white/20 hover:border-white/30 transition-all disabled:opacity-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

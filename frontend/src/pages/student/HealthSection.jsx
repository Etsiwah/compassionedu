import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

export default function HealthSection() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    record_type: 'insurance_card',
    description: '',
    file: null
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/health/my');
      setRecords(res.data);
    } catch (err) {
      toast.error('Failed to fetch health records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      toast.error('Please select a file to upload');
      return;
    }

    const data = new FormData();
    data.append('record_type', formData.record_type);
    data.append('description', formData.description);
    data.append('file', formData.file);

    try {
      setUploading(true);
      await api.post('/api/health', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Health record uploaded successfully');
      setIsModalOpen(false);
      setFormData({ record_type: 'insurance_card', description: '', file: null });
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload record');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/api/health/${id}`);
      toast.success('Record deleted');
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete record');
    }
  };

  if (loading) return <div className="text-white p-6">Loading health records...</div>;

  return (
    <div className="p-6 text-white max-w-5xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            Health Records
          </h1>
          <p className="text-gray-400 mt-2">Manage your health insurance and hospital bills.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20"
        >
          + Upload Record
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">🏥</div>
          <h3 className="text-xl font-medium text-white mb-2">No Health Records</h3>
          <p className="text-gray-400">You haven't uploaded any health records yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {records.map(record => (
            <div key={record.id} className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-xl hover:shadow-2xl transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold capitalize flex items-center gap-2">
                    {record.record_type === 'insurance_card' ? '🏥 Insurance Card' : 
                     record.record_type === 'hospital_bill' ? '🧾 Hospital Bill' : '📄 Other Document'}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {new Date(record.created_at).toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                  record.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  record.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}>
                  {record.status}
                </span>
              </div>
              
              {record.description && (
                <div className="mb-4 text-gray-300 text-sm p-3 bg-slate-900/50 rounded-lg">
                  {record.description}
                </div>
              )}

              {record.admin_notes && (
                <div className="mb-4 text-sm p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg text-blue-300">
                  <span className="font-semibold block mb-1">Admin Notes:</span>
                  {record.admin_notes}
                </div>
              )}

              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-700/50">
                <a
                  href={`${api.defaults.baseURL || ''}${record.file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors"
                >
                  View Document
                </a>
                {record.status === 'pending' && (
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Upload Health Record</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Document Type</label>
                <select
                  value={formData.record_type}
                  onChange={(e) => setFormData({ ...formData, record_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="insurance_card">Insurance Card</option>
                  <option value="hospital_bill">Hospital Bill</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="Add any notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">File Attachment</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 transition-colors cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-2">Max size: 10MB. Formats: PDF, JPG, PNG.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../utils/api';

export default function AdminHealthSection() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  // Review Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [reviewData, setReviewData] = useState({
    status: 'approved',
    admin_notes: ''
  });
  const [reviewing, setReviewing] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/health/admin/all', {
        params: filter !== 'all' ? { status: filter } : {}
      });
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
  }, [filter]);

  const openReviewModal = (record) => {
    setSelectedRecord(record);
    setReviewData({
      status: record.status === 'pending' ? 'approved' : record.status,
      admin_notes: record.admin_notes || ''
    });
    setIsModalOpen(true);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      setReviewing(true);
      await api.patch(`/api/health/admin/${selectedRecord.id}/review`, reviewData);
      toast.success('Record reviewed successfully');
      setIsModalOpen(false);
      fetchRecords();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to review record');
    } finally {
      setReviewing(false);
    }
  };

  if (loading && records.length === 0) {
    return <div className="text-white p-6">Loading health records...</div>;
  }

  return (
    <div className="p-6 text-white max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
            Health Records Management
          </h1>
          <p className="text-gray-400 mt-2">Review and manage student health records.</p>
        </div>
        
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                filter === f 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-slate-800 text-gray-400 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Student</th>
                <th className="px-6 py-4 font-semibold">Record Type</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No health records found matching the current filter.
                  </td>
                </tr>
              ) : (
                records.map(record => (
                  <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{record.student_name}</div>
                      <div className="text-xs text-gray-500">{record.student_email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="capitalize flex items-center gap-2">
                        {record.record_type === 'insurance_card' ? '🏥 Insurance Card' : 
                         record.record_type === 'hospital_bill' ? '🧾 Hospital Bill' : '📄 Other'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                        record.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        record.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <a
                        href={`${api.defaults.baseURL || ''}${record.file_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        View File
                      </a>
                      <a
                        href={`${api.defaults.baseURL || ''}${record.file_url}`}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => openReviewModal(record)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {isModalOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Review Health Record</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 bg-slate-800/50">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="block text-gray-500 mb-1">Student</span>
                  <span className="font-medium text-white">{selectedRecord.student_name}</span>
                </div>
                <div>
                  <span className="block text-gray-500 mb-1">Type</span>
                  <span className="font-medium text-white capitalize">{selectedRecord.record_type.replace('_', ' ')}</span>
                </div>
              </div>
              
              {selectedRecord.description && (
                <div className="mb-4 text-sm">
                  <span className="block text-gray-500 mb-1">Student Description</span>
                  <div className="bg-slate-800 p-3 rounded-lg text-gray-300 border border-slate-700">
                    {selectedRecord.description}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <div className="flex gap-3">
                  <a
                    href={`${api.defaults.baseURL || ''}${selectedRecord.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors border border-blue-500/30"
                  >
                    📄 View Document
                  </a>
                  <a
                    href={`${api.defaults.baseURL || ''}${selectedRecord.file_url}`}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 rounded-lg text-sm font-medium transition-colors border border-orange-500/30"
                  >
                    ⬇️ Download
                  </a>
                </div>
              </div>
            </div>

            <form onSubmit={handleReview} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Review Status</label>
                <div className="flex gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all border-green-500/30 bg-green-500/10 hover:bg-green-500/20">
                    <input 
                      type="radio" 
                      name="status" 
                      value="approved"
                      checked={reviewData.status === 'approved'}
                      onChange={(e) => setReviewData({...reviewData, status: e.target.value})}
                      className="accent-green-500"
                    />
                    <span className="text-green-400 font-medium">Approve</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all border-red-500/30 bg-red-500/10 hover:bg-red-500/20">
                    <input 
                      type="radio" 
                      name="status" 
                      value="rejected"
                      checked={reviewData.status === 'rejected'}
                      onChange={(e) => setReviewData({...reviewData, status: e.target.value})}
                      className="accent-red-500"
                    />
                    <span className="text-red-400 font-medium">Reject</span>
                  </label>
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20">
                    <input 
                      type="radio" 
                      name="status" 
                      value="pending"
                      checked={reviewData.status === 'pending'}
                      onChange={(e) => setReviewData({...reviewData, status: e.target.value})}
                      className="accent-yellow-500"
                    />
                    <span className="text-yellow-400 font-medium">Pending</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Admin Notes (Optional)</label>
                <textarea
                  value={reviewData.admin_notes}
                  onChange={(e) => setReviewData({ ...reviewData, admin_notes: e.target.value })}
                  rows="3"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  placeholder="Reason for rejection, or general notes..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {reviewing ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

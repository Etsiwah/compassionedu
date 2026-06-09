import api from '../../utils/api';

export default function ReportCardDownload({ studentId, term }) {
  async function handleDownload() {
    try {
      const res = await api.get(`/results/${studentId}/report-card/${encodeURIComponent(term)}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-card-${term}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download report card.');
    }
  }

  if (!term) return null;
  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
    >
      📄 Download Report Card
    </button>
  );
}

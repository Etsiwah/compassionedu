import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../utils/api';

const FEE_LEVELS = {
  Diploma: {
    years: ['Diploma Year 1', 'Diploma Year 2'],
    periods: ['Semester 1', 'Semester 2'],
  },
  'Top Up': {
    years: ['Top Up Year 1', 'Top Up Year 2'],
    periods: ['Semester 1', 'Semester 2'],
  },
  Degree: {
    years: ['Degree Year 1', 'Degree Year 2', 'Degree Year 3', 'Degree Year 4'],
    periods: ['Semester 1', 'Semester 2'],
  },
};

const PAYMENT_METHODS = ['Mobile Money', 'Bank Transfer', 'Card', 'Cash'];

function fmt(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function currency(value) {
  return `GHS ${Number(value || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
}

function fileUrl(value) {
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  return `${(api.defaults.baseURL || '').replace(/\/api\/?$/, '')}${value}`;
}

function StatusBadge({ status }) {
  const map = {
    paid: 'text-green-300 bg-green-500/10 border-green-500/25',
    approved: 'text-green-300 bg-green-500/10 border-green-500/25',
    pending: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    pending_approval: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    rejected: 'text-red-300 bg-red-500/10 border-red-500/25',
    unpaid: 'text-white/45 bg-white/5 border-white/10',
    partially_paid: 'text-blue-300 bg-blue-500/10 border-blue-500/25',
    overdue: 'text-red-300 bg-red-500/10 border-red-500/25',
  };
  const label = {
    paid: 'Paid',
    approved: 'Paid',
    pending: 'Pending Approval',
    pending_approval: 'Pending Approval',
    rejected: 'Rejected',
    unpaid: 'Not Submitted',
    partially_paid: 'Partly Paid',
    overdue: 'Overdue',
  }[status] || status;

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status] || map.unpaid}`}>
      {label}
    </span>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      {children}
    </div>
  );
}

function yearStatus(programme, year, payments) {
  const matching = payments.filter(payment => payment.academic_level === programme && payment.year_label === year);
  if (matching.some(payment => payment.status === 'approved')) return 'paid';
  if (matching.some(payment => payment.status === 'pending')) return 'pending_approval';
  if (matching.some(payment => payment.status === 'rejected')) return 'rejected';
  return 'unpaid';
}

function YearStatusGrid({ payments }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Object.entries(FEE_LEVELS).map(([programme, structure]) => (
        <Panel key={programme} className="p-4">
          <h3 className="text-sm font-bold text-white">{programme}</h3>
          <div className="mt-3 space-y-2">
            {structure.years.map(year => (
              <div key={year} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5">
                <span className="text-sm text-white/70">{year}</span>
                <StatusBadge status={yearStatus(programme, year, payments)} />
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function ReceiptUploadForm({ feeRecords, onUploaded }) {
  const [programme, setProgramme] = useState('Diploma');
  const [yearLabel, setYearLabel] = useState(FEE_LEVELS.Diploma.years[0]);
  const [periodLabel, setPeriodLabel] = useState('Semester 1');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Mobile Money');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const structure = FEE_LEVELS[programme];
  const matchedRecord = feeRecords.find(record =>
    record.academic_level === programme &&
    record.year_label === yearLabel &&
    record.period_label === periodLabel
  );

  function changeProgramme(value) {
    setProgramme(value);
    setYearLabel(FEE_LEVELS[value].years[0]);
    setPeriodLabel(FEE_LEVELS[value].periods[0]);
  }

  function handleFile(nextFile) {
    if (!nextFile) return;
    const blockedExtensions = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.ps1', '.vbs', '.js', '.jar'];
    const lowerName = nextFile.name.toLowerCase();
    if (blockedExtensions.some(ext => lowerName.endsWith(ext))) {
      setError('This file type is not allowed for security reasons.');
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setError('Receipt file is too large. Maximum size is 20 MB.');
      return;
    }
    setError('');
    setFile(nextFile);
    if (nextFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = event => setPreview({ type: 'image', src: event.target.result });
      reader.readAsDataURL(nextFile);
    } else {
      setPreview({ type: 'pdf', name: nextFile.name });
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!file) {
      setError('Please upload your school fees receipt.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError('Enter the amount shown on the receipt.');
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append('receipt', file);
      data.append('academic_level', programme);
      data.append('year_label', yearLabel);
      data.append('period_label', periodLabel);
      data.append('amount_paid', amount);
      data.append('payment_method', method);
      data.append('transaction_id', transactionId);
      data.append('payment_date', paymentDate);
      if (matchedRecord) data.append('fee_record_id', matchedRecord.id);

      await api.post('/fee-uploads/my/pay', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(`${yearLabel} receipt submitted. It is now pending admin approval.`);
      setAmount('');
      setTransactionId('');
      setFile(null);
      setPreview(null);
      onUploaded();
    } catch (err) {
      setError(err.response?.data?.error || 'Receipt upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Panel className="p-5">
      <div className="mb-5">
        <h3 className="text-base font-bold text-white">Upload School Fees Receipt</h3>
        <p className="mt-1 text-sm text-white/40">Choose your programme and year, attach the receipt, then submit for admin approval.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-white/55">
            Programme
            <select value={programme} onChange={event => changeProgramme(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {Object.keys(FEE_LEVELS).map(level => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label className="text-sm text-white/55">
            Year
            <select value={yearLabel} onChange={event => setYearLabel(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {structure.years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="text-sm text-white/55">
            Semester
            <select value={periodLabel} onChange={event => setPeriodLabel(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {structure.periods.map(period => <option key={period} value={period}>{period}</option>)}
            </select>
          </label>
        </div>

        {matchedRecord && (
          <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-white/35">Assigned fee</p>
              <p className="text-sm font-bold text-white">{currency(matchedRecord.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-white/35">Approved paid</p>
              <p className="text-sm font-bold text-green-300">{currency(matchedRecord.amount_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-white/35">Outstanding</p>
              <p className="text-sm font-bold text-red-300">{currency(matchedRecord.outstanding)}</p>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-white/55">
            Amount on receipt
            <input type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
          </label>
          <label className="text-sm text-white/55">
            Payment method
            <select value={method} onChange={event => setMethod(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {PAYMENT_METHODS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="text-sm text-white/55">
            Payment date
            <input type="date" value={paymentDate} onChange={event => setPaymentDate(event.target.value)} className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
          </label>
        </div>

        <label className="text-sm text-white/55">
          Transaction/reference number
          <input value={transactionId} onChange={event => setTransactionId(event.target.value)} placeholder="Optional" className="mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-400/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }} />
        </label>

        <div
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-2xl p-6 text-center transition"
          style={{
            border: `2px dashed ${dragging ? 'rgba(249,115,22,0.65)' : 'rgba(255,255,255,0.16)'}`,
            background: dragging ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.035)',
          }}
        >
          {preview ? (
            preview.type === 'image' ? (
              <img src={preview.src} alt="Receipt preview" className="mx-auto max-h-40 rounded-xl object-contain" />
            ) : (
              <div>
                <p className="text-sm font-bold text-white">{preview.name}</p>
              <p className="mt-1 text-xs text-white/40">Receipt file selected</p>
              </div>
            )
          ) : (
            <div>
              <p className="text-sm font-bold text-white">Attach school fees receipt</p>
              <p className="mt-1 text-xs text-white/40">Upload a file, image, audio, or video receipt. Maximum 20 MB.</p>
            </div>
          )}
          <input ref={fileRef} type="file" className="hidden" onChange={event => handleFile(event.target.files[0])} />
        </div>

        {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        {message && <p className="rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-300">{message}</p>}

        <button disabled={uploading} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-60">
          {uploading ? 'Submitting receipt...' : 'Submit Receipt for Approval'}
        </button>
      </form>
    </Panel>
  );
}

export default function FeesSection({ studentId }) {
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const feeRecords = summary?.records || [];

  const load = useCallback(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.allSettled([
      api.get('/fee-uploads/my/summary'),
      api.get('/fee-uploads/my/payments'),
    ])
      .then(([summaryRes, paymentsRes]) => {
        if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
        if (paymentsRes.status === 'fulfilled') setPayments(paymentsRes.value.data || []);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const latestPayments = useMemo(() => payments.slice(0, 5), [payments]);
  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'fees', label: 'Fee Records' },
    { id: 'upload', label: 'Upload Receipt' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-white">School Fees</h2>
        <p className="mt-0.5 text-sm text-white/40">Upload school fees receipts and track admin approval.</p>
      </div>

      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {tabs.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition md:text-sm ${
              tab === item.id ? 'bg-orange-500 text-white shadow' : 'text-white/50 hover:text-white/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="flex flex-col gap-5">
          {loading ? (
            <Panel className="p-8 text-center text-sm text-white/35">Loading...</Panel>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Panel className="p-4">
                  <p className="text-xs text-white/35">Assigned fees</p>
                  <p className="mt-1 text-xl font-bold text-white">{currency(summary?.total_fees)}</p>
                </Panel>
                <Panel className="p-4">
                  <p className="text-xs text-white/35">Approved paid</p>
                  <p className="mt-1 text-xl font-bold text-green-300">{currency(summary?.amount_paid)}</p>
                </Panel>
                <Panel className="p-4">
                  <p className="text-xs text-white/35">Outstanding</p>
                  <p className="mt-1 text-xl font-bold text-red-300">{currency(summary?.balance)}</p>
                </Panel>
              </div>
              <YearStatusGrid payments={payments} />
              <Panel className="p-5">
                <h3 className="text-base font-bold text-white">Recent Receipt Submissions</h3>
                <div className="mt-4 space-y-3">
                  {latestPayments.length ? latestPayments.map(payment => (
                    <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-white">{payment.year_label} - {payment.period_label}</p>
                        <p className="text-xs text-white/40">{payment.academic_level} submitted {fmt(payment.uploaded_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-orange-300">{currency(payment.amount_paid)}</span>
                        <StatusBadge status={payment.status} />
                      </div>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/35">No receipt submissions yet.</p>
                  )}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}

      {tab === 'fees' && (
        <div className="flex flex-col gap-3">
          {feeRecords.length ? feeRecords.map(record => (
            <Panel key={record.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{record.year_label} - {record.period_label}</p>
                  <p className="text-xs text-white/40">{record.academic_level}</p>
                </div>
                <StatusBadge status={record.status} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-white/35">Total</p>
                  <p className="text-sm font-bold text-white">{currency(record.total_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/35">Paid</p>
                  <p className="text-sm font-bold text-green-300">{currency(record.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/35">Outstanding</p>
                  <p className="text-sm font-bold text-red-300">{currency(record.outstanding)}</p>
                </div>
              </div>
              {record.due_date && <p className="mt-3 text-xs text-white/35">Due {fmt(record.due_date)}</p>}
            </Panel>
          )) : (
            <Panel className="p-8 text-center text-sm text-white/35">No fee records assigned yet. You can still upload a receipt for admin approval.</Panel>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <ReceiptUploadForm
          feeRecords={feeRecords}
          onUploaded={() => {
            load();
            setTab('history');
          }}
        />
      )}

      {tab === 'history' && (
        <div className="flex flex-col gap-3">
          {payments.length ? payments.map(payment => (
            <Panel key={payment.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{payment.year_label} - {payment.period_label}</p>
                  <p className="text-xs text-white/40">{payment.academic_level} - {payment.payment_method} - {fmt(payment.payment_date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-orange-300">{currency(payment.amount_paid)}</span>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
              {payment.transaction_id && <p className="mt-2 text-xs text-white/35">Reference: {payment.transaction_id}</p>}
              {payment.status === 'rejected' && (
                <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
                  Rejected. Please upload the receipt again.
                </p>
              )}
              {payment.admin_comment && <p className="mt-3 rounded-xl bg-white/[0.035] px-3 py-2 text-xs text-white/60">{payment.admin_comment}</p>}
              <a href={fileUrl(payment.file_url)} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-blue-300 hover:text-blue-200">
                View uploaded receipt
              </a>
            </Panel>
          )) : (
            <Panel className="p-8 text-center text-sm text-white/35">No receipt submissions yet.</Panel>
          )}
        </div>
      )}
    </div>
  );
}

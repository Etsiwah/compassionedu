import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

const tabs = [
  'Overview',
  'Academic',
  'Parents/Guardian',
  'Sponsorship',
  'Documents',
  'Health',
  'Activity Logs',
];

const fieldClass = 'w-full rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-orange-400/60';
const fieldStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };

function fmtDate(value) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function text(value) {
  if (value === 0) return '0';
  return value || 'Not recorded';
}

function assetUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const apiBase = api.defaults.baseURL || '';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${value}`;
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST';
}

function Glass({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.24)',
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const value = status || 'unsponsored';
  const styles = {
    active: 'text-green-300 border-green-500/30 bg-green-500/10',
    inactive: 'text-red-300 border-red-500/30 bg-red-500/10',
    sponsored: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
    scholarship: 'text-violet-300 border-violet-500/30 bg-violet-500/10',
    unsponsored: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    ended: 'text-white/50 border-white/10 bg-white/5',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[value] || styles.ended}`}>
      {value}
    </span>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    orange: 'from-orange-500/20 to-orange-500/5 border-orange-400/20',
    green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-400/20',
    blue: 'from-sky-500/20 to-sky-500/5 border-sky-400/20',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-400/20',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${tones[tone] || tones.orange}`}>
      <p className="text-3xl font-bold text-white">{value ?? 0}</p>
      <p className="mt-1 text-sm font-medium text-white/50">{label}</p>
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(item => (
        <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/35">{item.label}</p>
          <p className="mt-1 break-words text-sm font-semibold text-white/85">{text(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, detail }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 p-8 text-center">
      <p className="text-sm font-semibold text-white/75">{title}</p>
      {detail && <p className="mt-1 text-sm text-white/40">{detail}</p>}
    </div>
  );
}

function OverviewDashboard({ overview }) {
  const counts = overview?.counts || {};
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total beneficiaries" value={counts.total} tone="orange" />
        <StatCard label="Active beneficiaries" value={counts.active} tone="green" />
        <StatCard label="Sponsored beneficiaries" value={counts.sponsored} tone="blue" />
        <StatCard label="Unsponsored beneficiaries" value={counts.unsponsored} tone="amber" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Glass className="p-5 xl:col-span-1">
          <h3 className="text-base font-bold text-white">Grouped by Level</h3>
          <div className="mt-4 space-y-3">
            {(overview?.groupedByLevel || []).map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/[0.035] px-3 py-2.5">
                <span className="text-sm text-white/70">{item.label}</span>
                <span className="text-sm font-bold text-white">{item.count}</span>
              </div>
            ))}
            {(overview?.groupedByLevel || []).length === 0 && <p className="text-sm text-white/40">No level data yet.</p>}
          </div>
        </Glass>

        <Glass className="p-5 xl:col-span-1">
          <h3 className="text-base font-bold text-white">Grouped by Institution</h3>
          <div className="mt-4 space-y-3">
            {(overview?.groupedByInstitution || []).map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5">
                <span className="truncate text-sm text-white/70">{item.label}</span>
                <span className="text-sm font-bold text-white">{item.count}</span>
              </div>
            ))}
            {(overview?.groupedByInstitution || []).length === 0 && <p className="text-sm text-white/40">No institution data yet.</p>}
          </div>
        </Glass>

        <Glass className="p-5 xl:col-span-1">
          <h3 className="text-base font-bold text-white">Recently Added</h3>
          <div className="mt-4 space-y-3">
            {(overview?.recentlyAdded || []).map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {initials(item.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white/85">{item.name}</p>
                  <p className="text-xs text-white/35">{fmtDate(item.created_at)}</p>
                </div>
              </div>
            ))}
            {(overview?.recentlyAdded || []).length === 0 && <p className="text-sm text-white/40">No recent students yet.</p>}
          </div>
        </Glass>
      </div>
    </>
  );
}

function BeneficiaryDetail({ id, onBack }) {
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/beneficiaries/${id}`)
      .then(res => {
        setProfile(res.data);
        setError('');
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load beneficiary profile'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function exportPdf() {
    const res = await api.get(`/beneficiaries/${id}/export.pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${profile?.summary?.name || 'beneficiary'}-profile.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  if (loading) return <Glass className="p-12 text-center text-sm text-white/45">Loading beneficiary profile...</Glass>;
  if (error) return <Glass className="p-8 text-sm text-red-300">{error}</Glass>;
  if (!profile) return null;

  const { summary, personal, academic, parents_guardian: parents, sponsorship, health, documents, activity_logs: activityLogs } = profile;

  return (
    <div className="flex flex-col gap-5">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-surface { color: #111827 !important; background: white !important; border: 0 !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10">Back to beneficiaries</button>
        <div className="flex flex-wrap gap-2">
          <a href={`mailto:${summary.email}`} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10">Email</a>
          {personal.phone && (
            <a href={`sms:${personal.phone}`} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10">SMS</a>
          )}
          <button onClick={exportPdf} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10">Export PDF</button>
          <button onClick={() => window.print()} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">Print Profile</button>
        </div>
      </div>

      <Glass className="print-surface p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            {summary.photo_url ? (
              <img src={assetUrl(summary.photo_url)} alt={summary.name} className="h-20 w-20 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-500 text-xl font-bold text-white">
                {initials(summary.name)}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{summary.name}</h2>
              <p className="mt-1 text-sm text-white/45">{summary.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={summary.status} />
                <StatusBadge status={summary.sponsorship_status} />
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/[0.035] p-3">
              <p className="text-xs text-white/35">Beneficiary ID</p>
              <p className="text-sm font-bold text-white">{text(personal.beneficiary_id)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.035] p-3">
              <p className="text-xs text-white/35">Project Number</p>
              <p className="text-sm font-bold text-white">{text(personal.project_number)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.035] p-3">
              <p className="text-xs text-white/35">Institution</p>
              <p className="text-sm font-bold text-white">{text(academic.current_institution)}</p>
            </div>
          </div>
        </div>
      </Glass>

      <div className="no-print flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab
                ? 'border-orange-400/40 bg-orange-500/20 text-orange-200'
                : 'border-white/10 text-white/45 hover:bg-white/10 hover:text-white/75'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Glass className="print-surface p-5">
        {activeTab === 'Overview' && (
          <div className="space-y-5">
            <InfoGrid items={[
              { label: 'Full name', value: personal.full_name },
              { label: 'Gender', value: personal.gender },
              { label: 'Date of birth', value: fmtDate(personal.date_of_birth) },
              { label: 'Age', value: personal.age },
              { label: 'Nationality', value: personal.nationality },
              { label: 'Phone', value: personal.phone },
              { label: 'Address', value: personal.address },
              { label: 'GPS/location', value: personal.gps_location },
              { label: 'Religion', value: personal.religion },
              { label: 'Disability status', value: personal.disability_status },
              { label: 'Region', value: personal.region },
              { label: 'District', value: personal.district },
            ]} />
          </div>
        )}

        {activeTab === 'Academic' && (
          <div className="space-y-5">
            <InfoGrid items={[
              { label: 'Current institution', value: academic.current_institution },
              { label: 'Educational level', value: academic.educational_level },
              { label: 'Class/Form/Year', value: academic.class_form_year },
              { label: 'Program/Course', value: academic.program_course },
              { label: 'Student ID/index number', value: academic.student_index_number },
              { label: 'Graduation year', value: academic.graduation_year },
              { label: 'Attendance rate', value: `${academic.attendance?.attendance_rate || 0}%` },
              { label: 'Present / Absent / Late', value: `${academic.attendance?.present || 0} / ${academic.attendance?.absent || 0} / ${academic.attendance?.late || 0}` },
            ]} />
            <div>
              <h3 className="mb-3 text-base font-bold text-white">Results and Grades</h3>
              {academic.results?.length ? (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/[0.035] text-white/45">
                      <tr>
                        <th className="px-4 py-3 text-left">Subject</th>
                        <th className="px-4 py-3 text-left">Term</th>
                        <th className="px-4 py-3 text-left">Marks</th>
                        <th className="px-4 py-3 text-left">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {academic.results.map(result => (
                        <tr key={result.id} className="border-t border-white/5">
                          <td className="px-4 py-3 text-white/80">{result.subject}</td>
                          <td className="px-4 py-3 text-white/55">{result.term}</td>
                          <td className="px-4 py-3 text-white/80">{result.marks}</td>
                          <td className="px-4 py-3 text-white/80">{result.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No academic results yet" detail="Results entered by teachers will appear here." />
              )}
            </div>
          </div>
        )}

        {activeTab === 'Parents/Guardian' && (
          <InfoGrid items={[
            { label: "Father's full name", value: parents.father_full_name },
            { label: "Father's phone", value: parents.father_phone },
            { label: "Father's occupation", value: parents.father_occupation },
            { label: "Mother's full name", value: parents.mother_full_name },
            { label: "Mother's phone", value: parents.mother_phone },
            { label: "Mother's occupation", value: parents.mother_occupation },
            { label: 'Guardian full name', value: parents.guardian_full_name },
            { label: 'Guardian phone', value: parents.guardian_phone },
            { label: 'Guardian relationship', value: parents.guardian_relationship },
            { label: 'Emergency contact', value: parents.emergency_contact },
            { label: 'Emergency phone', value: parents.emergency_phone },
            { label: 'Parent email', value: parents.parent_email },
          ]} />
        )}

        {activeTab === 'Sponsorship' && (
          <div className="space-y-5">
            <InfoGrid items={[
              { label: 'Sponsorship status', value: sponsorship.status },
              { label: 'Sponsor', value: sponsorship.sponsor_name },
              { label: 'Sponsor email', value: sponsorship.sponsor_email },
              { label: 'Sponsor phone', value: sponsorship.sponsor_phone },
              { label: 'Scholarship status', value: sponsorship.scholarship_status },
              { label: 'Date joined', value: fmtDate(sponsorship.date_joined) },
              { label: 'Start date', value: fmtDate(sponsorship.start_date) },
              { label: 'End date', value: fmtDate(sponsorship.end_date) },
              { label: 'Financial support received', value: sponsorship.financial_support },
              { label: 'Items/resources received', value: sponsorship.items_received },
            ]} />
            <div>
              <h3 className="mb-3 text-base font-bold text-white">Sponsorship History</h3>
              {sponsorship.history?.length ? (
                <div className="space-y-3">
                  {sponsorship.history.map(item => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusBadge status={item.status} />
                        <span className="text-xs text-white/35">{fmtDate(item.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/80">{text(item.sponsor_name)}</p>
                      {item.notes && <p className="mt-1 text-sm text-white/45">{item.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No sponsorship history yet" />}
            </div>
          </div>
        )}

        {activeTab === 'Documents' && (
          <div className="space-y-5">
            <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div>
                <h3 className="text-base font-bold text-white">Documents</h3>
                <p className="text-sm text-white/40">Documents uploaded by the student appear here for admin review.</p>
              </div>
            </div>
            {documents?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {documents.map(doc => (
                  <a
                    key={doc.id}
                    href={assetUrl(doc.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-orange-400/35"
                  >
                    <p className="text-sm font-bold text-white">{doc.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-white/35">{doc.document_type}</p>
                    <p className="mt-2 text-xs text-white/35">{fmtDate(doc.created_at)}</p>
                  </a>
                ))}
              </div>
            ) : <EmptyState title="No documents uploaded" />}
          </div>
        )}

        {activeTab === 'Health' && (
          <InfoGrid items={[
            { label: 'Medical conditions', value: health.medical_conditions },
            { label: 'Allergies', value: health.allergies },
            { label: 'Health insurance details', value: health.health_insurance_details },
            { label: 'Special needs', value: health.special_needs },
            { label: 'Counseling notes', value: health.counseling_notes },
            { label: 'Welfare notes', value: health.welfare_notes },
          ]} />
        )}

        {activeTab === 'Activity Logs' && (
          <div className="space-y-5">
            {activityLogs?.length ? (
              <div className="relative space-y-4 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/10">
                {activityLogs.map(item => (
                  <div key={item.id} className="relative flex gap-4">
                    <div className="z-10 mt-1 h-8 w-8 rounded-full border border-orange-400/30 bg-orange-500/20" />
                    <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-white">{item.title}</p>
                        <p className="text-xs text-white/35">{fmtDate(item.created_at)}</p>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-wide text-orange-200/70">{item.activity_type}</p>
                      {item.description && <p className="mt-2 text-sm text-white/55">{item.description}</p>}
                      {item.actor_name && <p className="mt-2 text-xs text-white/35">By {item.actor_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="No activity logs yet" />}
          </div>
        )}
      </Glass>
    </div>
  );
}

export default function BeneficiariesSection() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [overview, setOverview] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    sponsorshipStatus: 'all',
    institution: '',
    level: '',
    gender: 'all',
    region: '',
    district: '',
    sponsor: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/beneficiaries${queryString ? `?${queryString}` : ''}`),
      api.get('/beneficiaries/overview'),
    ])
      .then(([listRes, overviewRes]) => {
        setBeneficiaries(listRes.data || []);
        setOverview(overviewRes.data || null);
        setError('');
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load beneficiaries'))
      .finally(() => setLoading(false));
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  if (selectedId) {
    return <BeneficiaryDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Beneficiaries / Students</h2>
          <p className="mt-0.5 text-sm text-white/40">Complete student profile, sponsorship, academic, welfare, and document management.</p>
        </div>
      </div>

      <OverviewDashboard overview={overview} />

      <Glass className="p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            className={`${fieldClass} lg:col-span-2`}
            style={fieldStyle}
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            placeholder="Search name, ID, project number, institution, sponsor..."
          />
          <select className={fieldClass} style={fieldStyle} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="all">All active statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
          <select className={fieldClass} style={fieldStyle} value={filters.sponsorshipStatus} onChange={e => setFilter('sponsorshipStatus', e.target.value)}>
            <option value="all">All sponsorship statuses</option>
            <option value="sponsored">Sponsored</option>
            <option value="unsponsored">Unsponsored</option>
            <option value="scholarship">Scholarship</option>
            <option value="ended">Ended</option>
          </select>
          <input className={fieldClass} style={fieldStyle} value={filters.institution} onChange={e => setFilter('institution', e.target.value)} placeholder="Institution" />
          <input className={fieldClass} style={fieldStyle} value={filters.level} onChange={e => setFilter('level', e.target.value)} placeholder="Level/Class" />
          <select className={fieldClass} style={fieldStyle} value={filters.gender} onChange={e => setFilter('gender', e.target.value)}>
            <option value="all">All genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
          <input className={fieldClass} style={fieldStyle} value={filters.sponsor} onChange={e => setFilter('sponsor', e.target.value)} placeholder="Sponsor" />
          <input className={fieldClass} style={fieldStyle} value={filters.region} onChange={e => setFilter('region', e.target.value)} placeholder="Region" />
          <input className={fieldClass} style={fieldStyle} value={filters.district} onChange={e => setFilter('district', e.target.value)} placeholder="District" />
          <button
            onClick={() => setFilters({ search: '', status: 'all', sponsorshipStatus: 'all', institution: '', level: '', gender: 'all', region: '', district: '', sponsor: '' })}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/10"
          >
            Clear Filters
          </button>
        </div>
      </Glass>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <Glass className="overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-white/35">Loading beneficiaries...</div>
        ) : beneficiaries.length === 0 ? (
          <div className="py-20">
            <EmptyState title="No beneficiaries found" detail="Students appear here automatically because Beneficiary and Student are the same entity." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.025] text-left text-xs uppercase tracking-wide text-white/35">
                  <th className="px-5 py-4">Beneficiary</th>
                  <th className="px-5 py-4">ID / Project</th>
                  <th className="px-5 py-4">Institution</th>
                  <th className="px-5 py-4">Level</th>
                  <th className="px-5 py-4">Sponsorship</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {beneficiaries.map(row => (
                  <tr key={row.id} className="border-b border-white/5 transition hover:bg-white/[0.035]">
                    <td className="px-5 py-4">
                      <button onClick={() => setSelectedId(row.id)} className="flex min-w-[220px] items-center gap-3 text-left">
                        {row.photo_url ? (
                          <img src={assetUrl(row.photo_url)} alt={row.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">{initials(row.name)}</span>
                        )}
                        <span>
                          <span className="block font-bold text-white/90">{row.name}</span>
                          <span className="block text-xs text-white/35">{row.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-white/60">
                      <p>{text(row.student_id_number)}</p>
                      <p className="text-xs text-white/35">{text(row.project_number)}</p>
                    </td>
                    <td className="px-5 py-4 text-white/60">{text(row.institution)}</td>
                    <td className="px-5 py-4 text-white/60">{text(row.level)}</td>
                    <td className="px-5 py-4"><StatusBadge status={row.sponsorship_status} /></td>
                    <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedId(row.id)} className="rounded-lg border border-sky-400/25 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/10">Open</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>

    </div>
  );
}

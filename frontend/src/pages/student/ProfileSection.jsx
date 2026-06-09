import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../utils/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const tabs = ['Personal', 'Academic', 'Parents/Guardian', 'Sponsorship', 'Health', 'Documents'];
const inputClass = 'w-full rounded-xl px-3 py-2.5 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-400/60';
const inputStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' };

function fmtDate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function assetUrl(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const apiBase = api.defaults.baseURL || '';
  return `${apiBase.replace(/\/api\/?$/, '')}${value}`;
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ST';
}

function SectionCard({ title, subtitle, children }) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <div className="mb-5">
        <h3 className="text-base font-bold text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-white/40">{subtitle}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', options, textarea = false }) {
  return (
    <label className={textarea ? 'md:col-span-2 text-sm text-white/55' : 'text-sm text-white/55'}>
      {label}
      {options ? (
        <select className={`${inputClass} mt-1.5`} style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)}>
          <option value="">Not selected</option>
          {options.map(option => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}
        </select>
      ) : textarea ? (
        <textarea rows={3} className={`${inputClass} mt-1.5 resize-none`} style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <input type={type} className={`${inputClass} mt-1.5`} style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} />
      )}
    </label>
  );
}

function emptyForm(profile = {}) {
  const parents = profile.parents_guardian || {};
  const health = profile.health || {};
  const sponsorship = profile.sponsorship || {};

  return {
    personal: {
      name: profile.name || '',
      phone: profile.phone || '',
      gender: profile.gender || '',
      date_of_birth: fmtDate(profile.date_of_birth),
      age: profile.age || '',
      nationality: profile.nationality || '',
      address: profile.address || '',
      gps_location: profile.gps_location || profile.location || '',
      religion: profile.religion || '',
      disability_status: profile.disability_status || '',
      student_id_number: profile.student_id_number || '',
      project_number: profile.project_number || '',
      region: profile.region || '',
      district: profile.district || '',
    },
    academic: {
      school_name: profile.school_name || '',
      level: profile.level || '',
      class_year: profile.class_year || '',
      program: profile.program || '',
      department: profile.department || '',
      enrollment_date: fmtDate(profile.enrollment_date),
      graduation_year: profile.graduation_year || '',
    },
    parents_guardian: {
      father_full_name: parents.father_full_name || profile.father_name || '',
      father_phone: parents.father_phone || '',
      father_occupation: parents.father_occupation || '',
      mother_full_name: parents.mother_full_name || profile.mother_name || '',
      mother_phone: parents.mother_phone || '',
      mother_occupation: parents.mother_occupation || '',
      guardian_full_name: parents.guardian_full_name || '',
      guardian_phone: parents.guardian_phone || '',
      guardian_relationship: parents.guardian_relationship || '',
      guardian_occupation: parents.guardian_occupation || '',
      emergency_contact: parents.emergency_contact || profile.emergency_name || '',
      emergency_phone: parents.emergency_phone || profile.emergency_phone || '',
    },
    sponsorship: {
      status: sponsorship.status || 'unsponsored',
      sponsor_name: sponsorship.sponsor_name || '',
      sponsor_email: sponsorship.sponsor_email || '',
      sponsor_phone: sponsorship.sponsor_phone || '',
      scholarship_status: sponsorship.scholarship_status || '',
      date_joined: fmtDate(sponsorship.date_joined),
      start_date: fmtDate(sponsorship.start_date),
      end_date: fmtDate(sponsorship.end_date),
      financial_support: sponsorship.financial_support || '',
      items_received: sponsorship.items_received || '',
      notes: sponsorship.notes || '',
    },
    health: {
      medical_conditions: health.medical_conditions || '',
      allergies: health.allergies || '',
      health_insurance_details: health.health_insurance_details || '',
      special_needs: health.special_needs || '',
      counseling_notes: health.counseling_notes || '',
      welfare_notes: health.welfare_notes || '',
    },
  };
}

export default function ProfileSection({ studentId }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [activeTab, setActiveTab] = useState('Personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const photoRef = useRef(null);

  const documents = useMemo(() => profile?.documents || [], [profile]);

  function load() {
    if (!studentId) return;
    setLoading(true);
    api.get(`/profile/${studentId}`)
      .then(res => {
        setProfile(res.data);
        setForm(emptyForm(res.data));
        setError('');
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [studentId]);

  function set(section, key, value) {
    setForm(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.patch(`/profile/${studentId}`, form);
      setMessage('Profile saved. Admins will now see these details in the Beneficiary section.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setMessage('');
    try {
      const data = new FormData();
      data.append('photo', file);
      await api.post(`/profile/${studentId}/photos`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Photo upload failed.');
    } finally {
      setPhotoUploading(false);
      if (photoRef.current) photoRef.current.value = '';
    }
  }

  async function uploadDocument(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setDocumentUploading(true);
    setMessage('');
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('title', file.name);
      data.append('document_type', 'student_profile');
      await api.post(`/profile/${studentId}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Document uploaded.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Document upload failed.');
    } finally {
      setDocumentUploading(false);
      event.target.value = '';
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!profile) return null;

  return (
    <form onSubmit={save} className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">My Beneficiary Profile</h2>
          <p className="mt-0.5 text-sm text-white/40">Complete these details so admins can view your student profile accurately.</p>
        </div>
        <button
          disabled={saving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {message && (
        <p className={`rounded-xl px-4 py-3 text-sm ${message.includes('failed') || message.includes('Failed') ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {message}
        </p>
      )}

      <div
        className="flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-orange-500">
          {profile.photo_url ? (
            <img src={assetUrl(profile.photo_url)} alt={profile.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">{initials(profile.name)}</div>
          )}
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            disabled={photoUploading}
            className="absolute bottom-2 right-2 rounded-lg bg-black/55 px-2 py-1 text-xs font-semibold text-white"
          >
            {photoUploading ? '...' : 'Photo'}
          </button>
          <input ref={photoRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{profile.name}</h3>
          <p className="text-sm text-white/45">{profile.email}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-orange-200/75">Beneficiary / Student Profile Source</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-semibold ${
              activeTab === tab
                ? 'border-orange-400/40 bg-orange-500/20 text-orange-200'
                : 'border-white/10 text-white/45 hover:bg-white/10 hover:text-white/75'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Personal' && (
        <SectionCard title="Personal Information" subtitle="These details appear in the admin Beneficiary profile overview.">
          <Field label="Full name" value={form.personal.name} onChange={v => set('personal', 'name', v)} />
          <Field label="Student/Beneficiary ID" value={form.personal.student_id_number} onChange={v => set('personal', 'student_id_number', v)} />
          <Field label="Project number" value={form.personal.project_number} onChange={v => set('personal', 'project_number', v)} />
          <Field label="Gender" value={form.personal.gender} onChange={v => set('personal', 'gender', v)} options={['Female', 'Male', 'Other']} />
          <Field label="Date of birth" type="date" value={form.personal.date_of_birth} onChange={v => set('personal', 'date_of_birth', v)} />
          <Field label="Age" type="number" value={form.personal.age} onChange={v => set('personal', 'age', v)} />
          <Field label="Nationality" value={form.personal.nationality} onChange={v => set('personal', 'nationality', v)} />
          <Field label="Phone" value={form.personal.phone} onChange={v => set('personal', 'phone', v)} />
          <Field label="Address" value={form.personal.address} onChange={v => set('personal', 'address', v)} />
          <Field label="GPS/location" value={form.personal.gps_location} onChange={v => set('personal', 'gps_location', v)} />
          <Field label="Region" value={form.personal.region} onChange={v => set('personal', 'region', v)} />
          <Field label="District" value={form.personal.district} onChange={v => set('personal', 'district', v)} />
          <Field label="Religion" value={form.personal.religion} onChange={v => set('personal', 'religion', v)} />
          <Field label="Disability status" value={form.personal.disability_status} onChange={v => set('personal', 'disability_status', v)} />
        </SectionCard>
      )}

      {activeTab === 'Academic' && (
        <SectionCard title="Academic Information" subtitle="Current school, level, class, program, and graduation information.">
          <Field label="Current institution/school" value={form.academic.school_name} onChange={v => set('academic', 'school_name', v)} />
          <Field label="Educational level" value={form.academic.level} onChange={v => set('academic', 'level', v)} />
          <Field label="Class/Form/Year" value={form.academic.class_year} onChange={v => set('academic', 'class_year', v)} />
          <Field label="Program/Course" value={form.academic.program} onChange={v => set('academic', 'program', v)} />
          <Field label="Department" value={form.academic.department} onChange={v => set('academic', 'department', v)} />
          <Field label="Enrollment date" type="date" value={form.academic.enrollment_date} onChange={v => set('academic', 'enrollment_date', v)} />
          <Field label="Graduation year" type="number" value={form.academic.graduation_year} onChange={v => set('academic', 'graduation_year', v)} />
        </SectionCard>
      )}

      {activeTab === 'Parents/Guardian' && (
        <SectionCard title="Parent / Guardian Information" subtitle="Family and emergency contact details for admin reference.">
          <Field label="Father's full name" value={form.parents_guardian.father_full_name} onChange={v => set('parents_guardian', 'father_full_name', v)} />
          <Field label="Father's phone number" value={form.parents_guardian.father_phone} onChange={v => set('parents_guardian', 'father_phone', v)} />
          <Field label="Father's occupation" value={form.parents_guardian.father_occupation} onChange={v => set('parents_guardian', 'father_occupation', v)} />
          <Field label="Mother's full name" value={form.parents_guardian.mother_full_name} onChange={v => set('parents_guardian', 'mother_full_name', v)} />
          <Field label="Mother's phone number" value={form.parents_guardian.mother_phone} onChange={v => set('parents_guardian', 'mother_phone', v)} />
          <Field label="Mother's occupation" value={form.parents_guardian.mother_occupation} onChange={v => set('parents_guardian', 'mother_occupation', v)} />
          <Field label="Guardian full name" value={form.parents_guardian.guardian_full_name} onChange={v => set('parents_guardian', 'guardian_full_name', v)} />
          <Field label="Guardian phone" value={form.parents_guardian.guardian_phone} onChange={v => set('parents_guardian', 'guardian_phone', v)} />
          <Field label="Guardian relationship" value={form.parents_guardian.guardian_relationship} onChange={v => set('parents_guardian', 'guardian_relationship', v)} />
          <Field label="Guardian occupation" value={form.parents_guardian.guardian_occupation} onChange={v => set('parents_guardian', 'guardian_occupation', v)} />
          <Field label="Emergency contact" value={form.parents_guardian.emergency_contact} onChange={v => set('parents_guardian', 'emergency_contact', v)} />
          <Field label="Emergency phone" value={form.parents_guardian.emergency_phone} onChange={v => set('parents_guardian', 'emergency_phone', v)} />
        </SectionCard>
      )}

      {activeTab === 'Sponsorship' && (
        <SectionCard title="Sponsorship Information" subtitle="Enter any sponsorship, scholarship, support, and resource details you know.">
          <Field label="Sponsorship status" value={form.sponsorship.status} onChange={v => set('sponsorship', 'status', v)} options={[
            { value: 'unsponsored', label: 'Unsponsored' },
            { value: 'sponsored', label: 'Sponsored' },
            { value: 'scholarship', label: 'Scholarship' },
            { value: 'ended', label: 'Ended' },
          ]} />
          <Field label="Sponsor details/name" value={form.sponsorship.sponsor_name} onChange={v => set('sponsorship', 'sponsor_name', v)} />
          <Field label="Sponsor email" value={form.sponsorship.sponsor_email} onChange={v => set('sponsorship', 'sponsor_email', v)} />
          <Field label="Sponsor phone" value={form.sponsorship.sponsor_phone} onChange={v => set('sponsorship', 'sponsor_phone', v)} />
          <Field label="Scholarship status" value={form.sponsorship.scholarship_status} onChange={v => set('sponsorship', 'scholarship_status', v)} />
          <Field label="Date joined" type="date" value={form.sponsorship.date_joined} onChange={v => set('sponsorship', 'date_joined', v)} />
          <Field label="Sponsorship start date" type="date" value={form.sponsorship.start_date} onChange={v => set('sponsorship', 'start_date', v)} />
          <Field label="Sponsorship end date" type="date" value={form.sponsorship.end_date} onChange={v => set('sponsorship', 'end_date', v)} />
          <Field label="Financial support received" type="number" value={form.sponsorship.financial_support} onChange={v => set('sponsorship', 'financial_support', v)} />
          <Field label="Items/resources received" textarea value={form.sponsorship.items_received} onChange={v => set('sponsorship', 'items_received', v)} />
          <Field label="Sponsorship notes" textarea value={form.sponsorship.notes} onChange={v => set('sponsorship', 'notes', v)} />
        </SectionCard>
      )}

      {activeTab === 'Health' && (
        <SectionCard title="Health & Welfare" subtitle="Medical, insurance, special needs, counseling, and welfare notes.">
          <Field label="Medical conditions" textarea value={form.health.medical_conditions} onChange={v => set('health', 'medical_conditions', v)} />
          <Field label="Allergies" textarea value={form.health.allergies} onChange={v => set('health', 'allergies', v)} />
          <Field label="Health insurance details" textarea value={form.health.health_insurance_details} onChange={v => set('health', 'health_insurance_details', v)} />
          <Field label="Special needs" textarea value={form.health.special_needs} onChange={v => set('health', 'special_needs', v)} />
          <Field label="Counseling notes" textarea value={form.health.counseling_notes} onChange={v => set('health', 'counseling_notes', v)} />
          <Field label="Welfare notes" textarea value={form.health.welfare_notes} onChange={v => set('health', 'welfare_notes', v)} />
        </SectionCard>
      )}

      {activeTab === 'Documents' && (
        <section
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Documents</h3>
              <p className="mt-1 text-sm text-white/40">Upload birth certificate, report cards, admission letters, ID cards, certificates, sponsorship documents, and passport pictures.</p>
            </div>
            <label className="cursor-pointer rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">
              {documentUploading ? 'Uploading...' : 'Upload Document'}
              <input type="file" className="hidden" onChange={uploadDocument} disabled={documentUploading} />
            </label>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {documents.length ? documents.map(doc => (
              <a
                key={doc.id}
                href={assetUrl(doc.file_url)}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/10 bg-white/[0.035] p-4 hover:border-orange-400/35"
              >
                <p className="text-sm font-bold text-white">{doc.title}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-white/35">{doc.document_type}</p>
              </a>
            )) : (
              <div className="rounded-xl border border-dashed border-white/12 p-6 text-sm text-white/40 md:col-span-2">
                No documents uploaded yet.
              </div>
            )}
          </div>
        </section>
      )}
    </form>
  );
}

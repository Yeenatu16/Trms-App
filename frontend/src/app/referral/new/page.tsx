"use client";
import { getApiUrl } from '@/lib/config';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import './page.css';
import { saveReferralDraft, LocalReferralDraft, LocalAttachment } from '@/lib/db';
import { runSyncEngine } from '@/lib/syncEngine';

const API_URL = getApiUrl();

type Facility = {
  id: string;
  name: string;
  code: string;
  status: string;
  services: Array<{
    id: string;
    clinicalService: { id: string; name: string; category: string; };
    status: string;
    bedsTotal: number;
    bedsAvailable: number;
    waitlistCount: number;
    statusNote?: string;
    equipmentLinks: Array<{ isMandatory: boolean; equipment: { name: string; functional: boolean; status: string } }>;
  }>;
};

type PatientSuggestion = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  sex: string;
  age: number | null;
  phone: string | null;
};

type PatientHistory = {
  allergies: string[];
  medications: string[];
  diagnoses: string[];
  clinicalNotes: string;
  referrals: Array<{
    id: string;
    originName: string;
    destName: string;
    status: string;
    clinicalSummary: string;
    createdAt: string;
  }>;
};

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Patient & Lookup', 'Destination & Service', 'Clinical Details', 'Attachments', 'Consent'];

export default function NewReferral() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [isOffline, setIsOffline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // MRN/Patient auto-fill state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PatientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);

  // Attachment state
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState<Partial<LocalReferralDraft>>({
    patient: { mrn: '', firstName: '', lastName: '', sex: 'UNKNOWN', phone: '', age: undefined },
    referral: { 
      originFacilityId: '', 
      destFacilityId: '', 
      selectedServiceId: '',
      priority: 'ROUTINE', 
      serviceCategory: '', 
      clinicalSummary: '' 
    },
    consentGiven: false,
    attachments: [],
  });

  // Verify Role & default Origin
  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== 'NURSE') {
        router.push('/');
      } else {
        setForm(prev => ({
          ...prev,
          referral: { ...prev.referral, originFacilityId: user.facilityId || '' } as any
        }));
      }
    }
  }, [user, isLoading, router]);

  // Online/offline detection
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = () => { setIsOffline(false); runSyncEngine(); };
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced Patient search
  const searchPatients = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetchWithAuth(`${API_URL}/api/patients/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setSuggestions(await res.json());
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchPatients(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  const fetchFacilities = async () => {
    setIsLoadingFacilities(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/facilities`);
      if (res.ok) setFacilities(await res.json());
    } catch (e) {
      console.error('Failed to fetch facilities', e);
    } finally {
      setIsLoadingFacilities(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchPatientHistory = async (id: string) => {
    setIsFetchingHistory(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/patients/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        setPatientHistory(data);
      }
    } catch (e) {
      console.error('Failed to fetch clinical history', e);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleSelectSuggestion = (s: PatientSuggestion) => {
    setSearchQuery(s.mrn);
    setForm(prev => ({
      ...prev,
      patient: {
        mrn: s.mrn,
        firstName: s.firstName,
        lastName: s.lastName,
        sex: s.sex as any,
        age: s.age ?? undefined,
        phone: s.phone ?? '',
      },
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    fetchPatientHistory(s.id);
  };

  // File attachment handler
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`"${file.name}" exceeds the 10 MB limit and was skipped.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          dataUrl,
          sizeKb: Math.round(file.size / 1024),
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consentGiven) {
      alert('Consent is legally required to refer this patient.');
      return;
    }
    if (!form.referral?.originFacilityId) {
      alert('You do not have an assigned origin facility. Cannot submit.');
      return;
    }
    if (!form.referral?.destFacilityId || !form.referral?.selectedServiceId) {
      alert('Destination facility and service must be selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalForm = { ...form, attachments } as any;

      if (!isOffline) {
        try {
          const patientRes = await fetchWithAuth(`${API_URL}/api/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form.patient)
          });
          if (patientRes.ok) {
            const patientData = await patientRes.json();
            finalForm.patientId = patientData.id;
          } else {
            console.warn("Failed to create patient online. Continuing with offline patient draft.");
          }
        } catch (pErr) {
          console.warn("Network error creating patient. Continuing with offline patient draft.", pErr);
        }
      }

      await saveReferralDraft(finalForm);
      runSyncEngine();
      alert(isOffline
        ? 'Draft saved offline! Will sync automatically when connected.'
        : 'Referral submitted & saved locally. Syncing to server...');
      router.push('/nurse'); // Redirect back to nurse dashboard
    } catch (err) {
      console.error(err);
      alert('Failed to save to local offline store.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePatient = (patch: Partial<typeof form.patient>) =>
    setForm(prev => ({ ...prev, patient: { ...prev.patient, ...patch } as any }));

  const updateReferral = (patch: Partial<typeof form.referral>) =>
    setForm(prev => ({ ...prev, referral: { ...prev.referral, ...patch } as any }));

  const isStepValid = (): boolean => {
    switch (step) {
      case 1:
        return !!(form.patient?.mrn && form.patient.firstName && form.patient.lastName && form.patient.sex !== 'UNKNOWN');
      case 2:
        return !!(form.referral?.selectedServiceId && form.referral.destFacilityId);
      case 3:
        return !!(form.referral?.clinicalSummary && form.referral.clinicalSummary.trim().length > 10);
      case 4:
        return true; // Attachments are optional
      case 5:
        return !!form.consentGiven;
      default:
        return false;
    }
  };

  if (isLoading || !user) return <div className="p-8 text-center"><span className="spinner"></span> Verifying authentication…</div>;

  return (
    <div className="referral-page">
      {isOffline && (
        <div className="offline-banner">
           Offline Mode — Data saved locally. Will sync automatically when connectivity is restored.
        </div>
      )}
      {!form.referral?.originFacilityId && !isLoading && (
        <div className="offline-banner" style={{ backgroundColor: 'var(--danger)', color: 'white' }}>
           You do not have an origin facility assigned. You cannot submit referrals. Contact an administrator.
        </div>
      )}

      <div className="referral-layout">
        
        {/* Main Wizard Form */}
        <div className="wizard-container card animate-fade-in">
          <div className="wizard-header">
            <h1 className="step-title">New Patient Referral</h1>
            
            {/* Step Indicator */}
            <div className="stepper-wrap">
              <div className="progress-bar">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
                  <div key={s} className={`step-indicator ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                    {step > s ? '✓' : s}
                  </div>
                ))}
              </div>
              <div className="step-labels">
                {STEP_LABELS.map((label, i) => (
                  <span key={i} className={`step-label ${step === i + 1 ? 'active-label' : ''}`}>{label}</span>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={step === TOTAL_STEPS ? handleSubmit : (e) => { e.preventDefault(); if (isStepValid()) setStep(s => s + 1); }}>
            
            {/* ── Step 1: Patient Demographics ── */}
            {step === 1 && (
              <div className="step-content">
                <h2 className="step-section-title">Patient Lookup & Demographics</h2>

                <div className="form-group" ref={searchRef} style={{ position: 'relative' }}>
                  <label>Search Existing Patient (MRN, Name, Phone)</label>
                  <div className="mrn-input-wrap">
                    <input
                      type="text"
                      className="form-input search-highlight"
                      placeholder="Type to search…"
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                        // If user clears the input completely, reset query
                        if (e.target.value === '') updatePatient({ mrn: '' });
                      }}
                    />
                    {isFetchingHistory && <span className="autofill-hint" style={{right: '3rem'}}>Loading history…</span>}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <ul className="suggestions-list">
                      {suggestions.map(s => (
                        <li key={s.id} onClick={() => handleSelectSuggestion(s)}>
                          <div className="patient-sugg">
                            <strong>{s.mrn}</strong> — {s.firstName} {s.lastName}
                            <div className="suggestion-meta">Sex: {s.sex} {s.age ? `· Age: ${s.age}` : ''} {s.phone ? `· Phone: ${s.phone}` : ''}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="divider-text">OR ENTER MANUALLY</div>

                <div className="input-row">
                  <div className="form-group">
                    <label>Medical Record Number (MRN) <span className="required">*</span></label>
                    <input required name="mrn" type="text" className="form-input" value={form.patient?.mrn}
                      onChange={e => updatePatient({ mrn: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>First Name <span className="required">*</span></label>
                    <input required name="firstName" type="text" className="form-input" value={form.patient?.firstName}
                      onChange={e => updatePatient({ firstName: e.target.value })} />
                  </div>
                </div>

                <div className="input-row">
                  <div className="form-group">
                    <label>Last Name <span className="required">*</span></label>
                    <input required name="lastName" type="text" className="form-input" value={form.patient?.lastName}
                      onChange={e => updatePatient({ lastName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input name="phone" type="tel" className="form-input" placeholder="+251 9XX XXX XXX" value={form.patient?.phone ?? ''}
                      onChange={e => updatePatient({ phone: e.target.value })} />
                  </div>
                </div>

                <div className="input-row">
                  <div className="form-group">
                    <label>Sex <span className="required">*</span></label>
                    <select name="sex" className="form-select" value={form.patient?.sex}
                      onChange={e => updatePatient({ sex: e.target.value as any })}>
                      <option value="UNKNOWN">Select…</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Age</label>
                    <input name="age" type="number" className="form-input" min={0} max={130} value={form.patient?.age ?? ''}
                      onChange={e => updatePatient({ age: parseInt(e.target.value) || undefined })} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Destination & Service ── */}
            {step === 2 && (
              <div className="step-content">
                <h2 className="step-section-title">Destination & Service selection</h2>

                {/* Priority Selection - Moved to top for clinical logic flow */}
                 <div className="form-group">
                  <label>Clinical Priority <span className="required">*</span></label>
                  <div className="priority-grid">
                    {(['ROUTINE', 'URGENT', 'EMERGENCY'] as const).map(p => (
                      <button
                        key={p} type="button"
                        name={`priority-${p.toLowerCase()}`}
                        className={`priority-btn priority-${p.toLowerCase()} ${form.referral?.priority === p ? 'selected' : ''}`}
                        onClick={() => updateReferral({ priority: p })}
                      >
                        {p === 'ROUTINE' ? '🟢 Routine' : p === 'URGENT' ? '🟡 Urgent' : '🔴 Emergency'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="hospital-first-label">1. Select Destination Hospital <span className="required">*</span></label>
                  <select 
                    required 
                    name="destFacilityId"
                    className="form-select select-lg"
                    value={form.referral?.destFacilityId || ''}
                    onChange={e => updateReferral({ destFacilityId: e.target.value, serviceCategory: '' })}
                  >
                    <option value="">{isLoadingFacilities ? 'Loading facilities…' : 'Choose destination facility…'}</option>
                    {facilities && facilities.map(f => (
                      <option key={f.id} value={f.id} disabled={f.status === 'UNAVAILABLE' || f.status === 'DOWN'}>
                        {f.name} {f.status === 'UNAVAILABLE' || f.status === 'DOWN' ? '(Offline)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {form.referral?.destFacilityId && (
                  <div className="form-group animate-fade-in" style={{ marginTop: '1.25rem' }}>
                    <label className="hospital-first-label">2. Select Target Service <span className="required">*</span></label>
                    <select 
                      required 
                      name="selectedServiceId"
                      className="form-select select-lg border-primary"
                      value={form.referral?.selectedServiceId || ''}
                      onChange={e => {
                        const sId = e.target.value;
                        const fac = facilities.find(f => f.id === form.referral?.destFacilityId);
                        const srv = fac?.services.find(s => s.id === sId);
                        updateReferral({ 
                          selectedServiceId: sId, 
                          serviceCategory: srv?.clinicalService?.name || '' 
                        });
                      }}
                    >
                      <option value="">Choose an available service…</option>
                      {(() => {
                        const fac = facilities.find(f => f.id === form.referral?.destFacilityId);
                        return fac?.services.map(s => {
                          const hasBrokenMandatoryEq = s.equipmentLinks?.some(l => l.isMandatory && !l.equipment.functional);
                          const isDisabled = s.status === 'FULL' || s.status === 'CLOSED' || s.status === 'UNAVAILABLE' || s.bedsAvailable <= 0 || hasBrokenMandatoryEq;
                          const serviceName = s.clinicalService?.name || 'Unknown Service';
                          
                          let displayStatus = s.status;
                          if (hasBrokenMandatoryEq) displayStatus = 'UNAVAILABLE (Eq Down)';
                          else if (s.bedsAvailable <= 0) displayStatus = 'FULL (No Beds)';
                          
                          return (
                            <option key={s.id} value={s.id} disabled={isDisabled}>
                              {serviceName} {isDisabled ? `— ${displayStatus}` : ''}
                            </option>
                          );
                        });
                      })()}
                    </select>
                  </div>
                )}

                {/* Dynamic Availability & Capacity Updates */}
                {form.referral?.destFacilityId && form.referral.serviceCategory && (
                  <div className="availability-context mt-4">
                    {(() => {
                      const fac = facilities.find(f => f.id === form.referral?.destFacilityId);
                      if (!fac) return null;

                      const service = fac.services.find(s => s.clinicalService?.name === form.referral?.serviceCategory);
                      const isFacDown = fac.status === 'DOWN' || fac.status === 'UNAVAILABLE';
                      const downEquipment = service?.equipmentLinks?.filter(l => !l.equipment.functional).map(l => l.equipment) || [];

                      if (isFacDown) return <div className="warning-box danger">⚠️ WARNING: This facility is offline.</div>;
                      if (!service) return <div className="warning-box">⚠️ Service not found.</div>;

                      let statusSeverity = 'success';
                      if (service.status === 'LIMITED_CAPACITY') statusSeverity = 'warning';
                      if (service.status === 'FULL') statusSeverity = 'danger';

                      return (
                        <div className="capacity-grid animate-fade-in">
                          <div className={`capacity-item cap-${statusSeverity}`}>
                            <span className="cap-label">Service Status</span>
                            <span className="cap-val">{service.status.replace('_', ' ')}</span>
                          </div>
                          
                          <div className="capacity-item">
                            <span className="cap-label">Bed Capacity</span>
                            <div className="cap-bar-cont">
                              <div className={`cap-bar-fill ${service.bedsAvailable === 0 ? 'bg-danger' : 'bg-primary'}`} 
                                   style={{width: `${service.bedsTotal > 0 ? (service.bedsAvailable/service.bedsTotal)*100 : 0}%`}}></div>
                            </div>
                            <span className="cap-meta">{service.bedsAvailable} / {service.bedsTotal} available</span>
                          </div>
                          
                          <div className="capacity-item">
                            <span className="cap-label">Queue</span>
                            <span className="cap-val cap-queue">{service.waitlistCount || 0} waiting</span>
                          </div>

                          {service.status === 'LIMITED_CAPACITY' && (
                             <div className="warning-box warning full-span mt-3">
                               ⚠️ Note: Service operating at limited capacity. Patient admission may be delayed.
                             </div>
                          )}

                          {service.statusNote && (
                            <div className="warning-box warning full-span mt-3" style={{ backgroundColor: 'var(--bg-card)', borderLeft: '4px solid var(--warning)' }}>
                              ℹ️ Status Note: {service.statusNote}
                            </div>
                          )}

                          {downEquipment.length > 0 && (
                            <div className="warning-box danger full-span mt-3">
                              🚨 EQUIPMENT WARNING: {downEquipment.map(e => e.name).join(', ')} reported as offline.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Clinical Summary ── */}
            {step === 3 && (
              <div className="step-content">
                <h2 className="step-section-title">Clinical Medical Summary</h2>
                <div className="form-group">
                  <label>Reason for Referral, Current Condition & Diagnostics <span className="required">*</span></label>
                  <textarea
                    required
                    name="clinicalSummary"
                    className="form-input"
                    style={{ minHeight: 220, fontSize: '0.95rem' }}
                    value={form.referral?.clinicalSummary}
                    onChange={e => updateReferral({ clinicalSummary: e.target.value })}
                    placeholder="Provide a comprehensive clinical summary..."
                  />
                  <p className="field-hint">{form.referral?.clinicalSummary?.trim().length ?? 0} chars / min 10 required. Include Vitals, history of present illness, and specific requests for the receiving team.</p>
                </div>
              </div>
            )}

            {/* ── Step 4: Attachments ── */}
            {step === 4 && (
              <div className="step-content">
                <h2 className="step-section-title">Clinical Attachments <span className="optional-tag">Optional</span></h2>
                <div className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                  <span className="drop-icon">📎</span>
                  <p>Drag & drop files here, or <strong>click to browse</strong></p>
                  <p className="field-hint">Upload X-Rays, Lab Reports, or Referral Letters. (Max 10 MB/file)</p>
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf,.dcm" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                {attachments.length > 0 && (
                  <ul className="attachment-list">
                    {attachments.map((att, i) => (
                      <li key={i} className="attachment-item">
                        <span className="attachment-icon">{att.type.startsWith('image') ? '🖼️' : '📄'}</span>
                        <div className="attachment-info">
                          <strong>{att.name}</strong>
                          <span className="attachment-meta">{att.sizeKb} KB · {att.type}</span>
                        </div>
                        <button type="button" className="remove-attachment" onClick={() => removeAttachment(i)}>✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ── Step 5: Consent & Submit ── */}
            {step === 5 && (
              <div className="step-content">
                <h2 className="step-section-title">Finalize & Consent</h2>
                
                <div className="summary-card">
                  <div className="summary-row"><span>Patient</span><strong>{form.patient?.firstName} {form.patient?.lastName} ({form.patient?.mrn})</strong></div>
                  <div className="summary-row"><span>Service Requested</span><strong>{form.referral?.serviceCategory}</strong></div>
                  <div className="summary-row"><span>Priority</span>
                    <strong className={`color-priority-${form.referral?.priority.toLowerCase()}`}>{form.referral?.priority}</strong>
                  </div>
                  <div className="summary-row"><span>Destination</span><strong>{facilities.find(f => f.id === form.referral?.destFacilityId)?.name}</strong></div>
                </div>
                
                <div className="consent-box">
                  <input type="checkbox" id="consent" checked={!!form.consentGiven} onChange={e => setForm(prev => ({ ...prev, consentGiven: e.target.checked }))} />
                  <label htmlFor="consent" className="consent-label">
                    <span><strong>Patient Data Transfer Consent</strong></span>
                    <span>I confirm the patient explicitly consents to transmitting their clinical data to the destination facility in accordance with regional Health Bureau policies.</span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="button-group">
              <button type="button" className={`btn btn-secondary ${step === 1 ? 'invisible' : ''}`} onClick={() => setStep(s => s - 1)}>← Back</button>
              <button type="submit" className="btn btn-primary btn-next" disabled={!isStepValid() || isSubmitting}>
                {step === TOTAL_STEPS ? (isSubmitting ? 'Submitting…' : '✓ Secure Submit Referral') : `Next Step →`}
              </button>
            </div>
          </form>
        </div>

        {/* Clinical History Sidebar */}
        {patientHistory && (
          <aside className="history-sidebar animate-fade-in-right">
            <div className="history-head">
              <h3>Clinical History Record</h3>
              <p>Found <strong>{patientHistory.referrals.length}</strong> previous events</p>
            </div>
            
            <div className="history-scrollable">
              <div className="history-section">
                <div className="history-sec-title"><span className="history-icon danger">⚠️</span> Allergies</div>
                {patientHistory.allergies.length > 0 ? (
                  <div className="history-tags">{patientHistory.allergies.map(a => <span key={a} className="history-tag allergy-tag">{a}</span>)}</div>
                ) : <div className="history-empty">No known allergies reported.</div>}
              </div>

              <div className="history-section">
                <div className="history-sec-title"><span className="history-icon primary">💊</span> Active Medications</div>
                {patientHistory.medications.length > 0 ? (
                  <ul className="history-list">{patientHistory.medications.map(m => <li key={m}>{m}</li>)}</ul>
                ) : <div className="history-empty">No current medications recorded.</div>}
              </div>

              <div className="history-section">
                <div className="history-sec-title"><span className="history-icon warning">📋</span> Prior Diagnoses</div>
                {patientHistory.diagnoses.length > 0 ? (
                  <ul className="history-list">{patientHistory.diagnoses.map(d => <li key={d}>{d}</li>)}</ul>
                ) : <div className="history-empty">No diagnoses recorded.</div>}
              </div>

              {patientHistory.clinicalNotes && (
                <div className="history-section">
                  <div className="history-sec-title"><span className="history-icon teal">📝</span> Medical Notes</div>
                  <div className="history-note-box">{patientHistory.clinicalNotes}</div>
                </div>
              )}

              <div className="history-section">
                <div className="history-sec-title"><span className="history-icon">🏥</span> Past Referrals</div>
                {patientHistory.referrals.length > 0 ? (
                  <div className="history-timeline">
                    {patientHistory.referrals.map(r => (
                      <div key={r.id} className="timeline-item">
                        <div className="timeline-date">{new Date(r.createdAt).toLocaleDateString()}</div>
                        <div className="timeline-content">
                          <span className="tl-direction">Referred to <strong>{r.destName}</strong></span>
                          <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="history-empty">No previous referrals found in TRMS.</div>}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

"use client";
import { getApiUrl } from '@/lib/config';
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { AlertTriangle, Clock, Hospital, RefreshCw, Filter } from 'lucide-react';

const API_URL = getApiUrl();

const PRIORITY_ORDER: Record<string, number> = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2 };
const PRIORITY_COLOR: Record<string, string> = { EMERGENCY: 'emergency', URGENT: 'urgent', ROUTINE: 'routine' };
const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: 'badge-submitted', ACCEPTED: 'badge-accepted', REJECTED: 'badge-rejected',
  COMPLETED: 'badge-completed', PENDING_INFO: 'badge-pending_info',
};

export default function LiaisonTriagePage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('SUBMITTED');
  const [actionModal, setActionModal] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState('ACCEPTED');
  const [clinicalNote, setClinicalNote] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/referrals/incoming`);
      if (res.ok) setReferrals(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReferrals(); }, []);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/referrals/${actionModal.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: actionStatus, clinicalNote }),
      });
      if (res.ok) { setActionModal(null); setClinicalNote(''); fetchReferrals(); }
      else { const err = await res.json(); alert(err.message || 'Failed'); }
    } catch { alert('Network error'); }
    finally { setSaving(false); }
  };

  const filtered = referrals
    .filter(r => (priorityFilter === 'ALL' || r.priority === priorityFilter) && (statusFilter === 'ALL' || r.status === statusFilter))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Triage Queue</h1>
          <p className="page-subtitle">Prioritized incoming referrals — sorted by urgency</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchReferrals}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={14} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Priority:</span>
        </div>
        {['ALL', 'EMERGENCY', 'URGENT', 'ROUTINE'].map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            className={`role-tab ${priorityFilter === p ? 'active' : ''}`}
            style={{ fontSize: '0.75rem' }}>
            {p === 'ALL' ? 'All' : p}
          </button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border-color)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status:</span>
        </div>
        {['ALL', 'SUBMITTED', 'ACCEPTED', 'PENDING_INFO'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`role-tab ${statusFilter === s ? 'active' : ''}`}
            style={{ fontSize: '0.75rem' }}>
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="table-loading"><span className="spinner" /> Loading triage queue…</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <AlertTriangle size={36} style={{ color: 'var(--border-color)' }} />
            <p>No referrals match these filters.</p>
          </div>
        ) : filtered.map(r => (
          <div key={r.id} className="triage-queue-item">
            <div className={`triage-priority-indicator ${PRIORITY_COLOR[r.priority] || 'routine'}`} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>#{r.id?.substring(0,8)}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.patient?.firstName} {r.patient?.lastName}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${r.priority?.toLowerCase()}`}>{r.priority}</span>
                  <span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`}>{r.status?.replace('_',' ')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                  <Hospital size={11} /> {r.originFacility?.name || '—'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                  <Clock size={11} /> {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              {r.clinicalSummary && (
                <p style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 550, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.clinicalSummary}
                </p>
              )}
            </div>
            {r.status === 'SUBMITTED' && (
              <div className="action-buttons-row">
                <button className="btn btn-success btn-sm" onClick={() => { setActionModal(r); setActionStatus('ACCEPTED'); }}>Accept</button>
                <button className="btn btn-danger btn-sm"  onClick={() => { setActionModal(r); setActionStatus('REJECTED'); }}>Reject</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setActionModal(r); setActionStatus('REDIRECTED'); }}>Redirect</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {actionModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setActionModal(null); }}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <h2>Clinical Decision</h2>
                <p className="page-subtitle">{actionModal.patient?.firstName} {actionModal.patient?.lastName} · {actionModal.priority}</p>
              </div>
              <button className="modal-close" onClick={() => setActionModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAction}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Decision</label>
                  <select className="form-select" value={actionStatus} onChange={e => setActionStatus(e.target.value)}>
                    <option value="ACCEPTED">Accept</option>
                    <option value="REJECTED">Reject</option>
                    <option value="REDIRECTED">Redirect to another facility</option>
                    <option value="PENDING_INFO">Request More Information</option>
                    <option value="COMPLETED">Mark Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Clinical Note</label>
                  <textarea className="form-textarea" rows={4} placeholder="Optional notes, instructions, or redirect info…"
                    value={clinicalNote} onChange={e => setClinicalNote(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

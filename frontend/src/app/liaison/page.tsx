"use client";
import { getApiUrl } from '@/lib/config';
import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Activity, CheckCircle, XCircle, AlertTriangle, Clock, Hospital, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const API_URL = getApiUrl();

const STATUS_BADGE: Record<string, string> = {
  DRAFT:        'badge-draft',
  SUBMITTED:    'badge-submitted',
  ACCEPTED:     'badge-accepted',
  REJECTED:     'badge-rejected',
  REDIRECTED:   'badge-redirected',
  PENDING_INFO: 'badge-pending_info',
  COMPLETED:    'badge-completed',
};

const PRIORITY_BADGE: Record<string, string> = {
  EMERGENCY: 'badge-emergency',
  URGENT:    'badge-urgent',
  ROUTINE:   'badge-routine',
};

const PRIORITY_COLOR: Record<string, string> = {
  EMERGENCY: 'emergency',
  URGENT:    'urgent',
  ROUTINE:   'routine',
};

export default function LiaisonPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState('ACCEPTED');
  const [clinicalNote, setClinicalNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/referrals/incoming`);
      if (res.ok) setReferrals(await res.json());
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
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
      else { const err = await res.json(); alert(err.message || 'Update failed'); }
    } catch { alert('Network error'); }
    finally { setSaving(false); }
  };

  const filteredReferrals = referrals.filter(r => filter === 'ALL' || r.status === filter || r.priority === filter);

  const submitted  = referrals.filter(r => r.status === 'SUBMITTED').length;
  const accepted   = referrals.filter(r => r.status === 'ACCEPTED').length;
  const completed  = referrals.filter(r => r.status === 'COMPLETED').length;
  const emergency  = referrals.filter(r => r.priority === 'EMERGENCY' && r.status === 'SUBMITTED').length;

  return (
    <div className="liaison-page">
      {/* Hero */}
      <div className="liaison-hero">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>Welcome, {user?.firstName}</h1>
          <p style={{ fontSize: '0.875rem', color: '#93c5fd' }}>
            Liaison Officer · Assigned Facility
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{submitted}</div>
            <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24' }}>{emergency}</div>
            <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Emergency</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>{accepted}</div>
            <div style={{ fontSize: '0.72rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Accepted</div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid-4">
        <div className="kpi-card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Activity size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Incoming</span>
          </div>
          <div className="kpi-value">{submitted}</div>
          <div className="kpi-label">Awaiting Review</div>
        </div>
        <div className="kpi-card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={18} color="var(--danger)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Emergency</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{emergency}</div>
          <div className="kpi-label">Critical Priority</div>
        </div>
        <div className="kpi-card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={18} color="var(--success)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Accepted</span>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{accepted}</div>
          <div className="kpi-label">In Care</div>
        </div>
        <div className="kpi-card card-hover">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle size={18} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Completed</span>
          </div>
          <div className="kpi-value">{completed}</div>
          <div className="kpi-label">Discharged</div>
        </div>
      </div>

      {/* Main Queue */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">Incoming Referral Queue</div>
            <div className="panel-desc">Manage and respond to referrals sent to your facility</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {['ALL', 'SUBMITTED', 'ACCEPTED', 'EMERGENCY', 'PENDING_INFO'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`role-tab ${filter === s ? 'active' : ''}`}
                style={{ fontSize: '0.72rem' }}>
                {s === 'ALL' ? 'All' : s === 'PENDING_INFO' ? 'Info Needed' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={fetchReferrals}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="table-loading"><span className="spinner" /> Loading referrals…</div>
        ) : filteredReferrals.length === 0 ? (
          <div className="table-empty">
            <Activity size={36} style={{ color: 'var(--border-color)' }} />
            <p>No referrals in this category.</p>
          </div>
        ) : (
          <div>
            {filteredReferrals.map(r => (
              <div key={r.id} className="triage-queue-item">
                <div className={`triage-priority-indicator ${PRIORITY_COLOR[r.priority] || 'routine'}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>#{r.id?.substring(0,8)}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {r.patient?.firstName} {r.patient?.lastName}
                      </div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`}>{r.status?.replace('_', ' ')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${PRIORITY_BADGE[r.priority] || 'badge-neutral'}`}>{r.priority}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Hospital size={11} /> From: {r.originFacility?.name || '—'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Clock size={11} /> {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {r.clinicalSummary && (
                    <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.clinicalSummary}
                    </p>
                  )}
                </div>
                {r.status === 'SUBMITTED' && (
                  <div className="action-buttons-row">
                    <button className="btn btn-success btn-sm" onClick={() => { setActionModal(r); setActionStatus('ACCEPTED'); }}>Accept</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setActionModal(r); setActionStatus('REJECTED'); }}>Reject</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setActionModal(r); setActionStatus('PENDING_INFO'); }}>Info Needed</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links to other Liaison pages */}
      <div className="grid-3">
        {[
          { href: '/liaison/triage', label: 'View Triage Queue', icon: AlertTriangle, desc: 'Prioritized view of all cases', color: 'var(--warning)' },
          { href: '/liaison/capacity', label: 'Manage Capacity', icon: Activity, desc: 'Update beds, waitlists & service status', color: 'var(--primary)' },
          { href: '/directory', label: 'Clinical Directory', icon: Hospital, desc: 'Browse network-wide services', color: 'var(--teal)' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div className="card card-hover" style={{ padding: '1.25rem', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <item.icon size={20} color={item.color} />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setActionModal(null); }}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <h2>Update Referral Status</h2>
                <p className="page-subtitle">
                  Patient: {actionModal.patient?.firstName} {actionModal.patient?.lastName}
                </p>
              </div>
              <button className="modal-close" onClick={() => setActionModal(null)}>✕</button>
            </div>
            <form onSubmit={handleAction}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Decision</label>
                  <select className="form-select" value={actionStatus} onChange={e => setActionStatus(e.target.value)}>
                    <option value="ACCEPTED">Accept — Patient will be received</option>
                    <option value="REJECTED">Reject — Cannot accept at this time</option>
                    <option value="REDIRECTED">Redirect — Send to another facility</option>
                    <option value="PENDING_INFO">Request More Info</option>
                    <option value="COMPLETED">Mark as Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Clinical Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <textarea className="form-textarea" rows={4} placeholder="Add context, instructions, or redirect details…"
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

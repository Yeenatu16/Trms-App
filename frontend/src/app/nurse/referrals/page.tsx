"use client";
import { getApiUrl } from '@/lib/config';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/api';
import './referrals.css';

const API_URL = getApiUrl();

const PRIORITY_BADGE: Record<string, string> = { EMERGENCY: 'badge-emergency', URGENT: 'badge-urgent', ROUTINE: 'badge-routine' };
const STATUS_BADGE: Record<string, string>   = { SUBMITTED: 'badge-submitted', ACCEPTED: 'badge-accepted', REJECTED: 'badge-danger', COMPLETED: 'badge-completed' };

export default function NurseReferrals() {
  const [filter, setFilter] = useState('ALL');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth(`${API_URL}/api/referrals/my`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const formatted = data.map((r: any) => ({
          id: r.id.substring(0, 8),
          patient: `${r.patient.firstName} ${r.patient.lastName}`,
          mrn: r.patient.mrn,
          priority: r.priority,
          status: r.status,
          hospital: r.destFacility?.name || 'Unknown',
          service: 'General', // Would be mapped from r.referral if strictly typed
          time: new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
          token: r.status === 'ACCEPTED' ? `TKN-${Math.floor(Math.random()*9000)+1000}` : null,
          feedbackNote: r.tasks && r.tasks.length > 0 ? r.tasks[0].notes : null
        }));
        setReferrals(formatted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? referrals : referrals.filter(r => r.status === filter);

  return (
    <div className="nurse-referrals-page">
      <div className="nurse-referrals-header">
        <h1>My Referrals</h1>
        <Link href="/referral/new" className="btn btn-primary btn-sm">+ New</Link>
      </div>

      {/* Status tabs */}
      <div className="ref-status-tabs">
        {['ALL', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED'].map(s => (
          <button
            key={s}
            className={`ref-tab ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            <span className="ref-tab-count">
              {s === 'ALL' ? referrals.length : referrals.filter((r: any) => r.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="referral-list">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No referrals in this category</div>
        ) : filtered.map(r => (
          <div key={r.id} className="referral-card">
            <div className="ref-card-top">
              <div className="ref-card-left">
                <div className="ref-id">{r.id}</div>
                <div className="ref-patient">{r.patient}</div>
                <div className="ref-mrn">{r.mrn}</div>
              </div>
              <div className="ref-card-right">
                <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-neutral'}`}>{r.status}</span>
              </div>
            </div>
            <div className="ref-card-body">
              <div className="ref-row">
                <span className="ref-row-icon">🏥</span>
                <span>{r.hospital}</span>
              </div>
              <div className="ref-row">
                <span className="ref-row-icon">🩺</span>
                <span>{r.service}</span>
              </div>
              {r.feedbackNote && (
                <div className="ref-feedback">
                  <strong>Outcome Feedback:</strong> {r.feedbackNote}
                </div>
              )}
            </div>
            <div className="ref-card-footer">
              <span className={`badge ${PRIORITY_BADGE[r.priority] ?? 'badge-neutral'}`}>{r.priority}</span>
              {r.token && (
                <span className="ref-token">🎫 {r.token}</span>
              )}
              <span className="ref-time">{r.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

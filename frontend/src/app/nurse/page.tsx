"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { startBackgroundSync } from '@/lib/syncEngine';
import { fetchWithAuth } from '@/lib/api';
import { Plus, ClipboardList, Hospital, AlertTriangle, ChevronRight, Clock, RefreshCw, Send, Globe } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PRIORITY_BADGE: Record<string, string> = {
  EMERGENCY: 'badge-emergency',
  URGENT: 'badge-urgent',
  ROUTINE: 'badge-routine',
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-draft',
  SUBMITTED: 'badge-submitted',
  ACCEPTED: 'badge-accepted',
  REJECTED: 'badge-rejected',
  REDIRECTED: 'badge-redirected',
  PENDING_INFO: 'badge-pending_info',
  COMPLETED: 'badge-completed',
};

export default function NurseHome() {
  const { user } = useAuth();
  const { t, lang, changeLanguage } = useTranslation();
  const [syncStatus, setSyncStatus] = useState('UP_TO_DATE');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  let greetingKey = 'greeting';
  if (hour >= 12 && hour < 18) greetingKey = 'greeting.afternoon';
  if (hour >= 18) greetingKey = 'greeting.evening';

  const firstName = user?.firstName ?? 'Nurse';

  useEffect(() => {
    startBackgroundSync((status: string) => setSyncStatus(status));
    fetchWithAuth(`${API_URL}/api/referrals/my`)
      .then((res: any) => res.ok ? res.json() : [])
      .then((data: any[]) => {
        setReferrals(data.map((r: any) => ({
          id: r.id.substring(0, 8),
          patient: `${r.patient?.firstName || 'Unknown'} ${r.patient?.lastName || ''}`.trim(),
          priority: r.priority,
          status: r.status,
          hospital: r.destFacility?.name || 'Unknown',
          time: new Date(r.createdAt || Date.now()).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }),
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeCount = referrals.filter(r => ['SUBMITTED', 'ACCEPTED', 'PENDING_INFO'].includes(r.status)).length;
  const doneCount = referrals.filter(r => r.status === 'COMPLETED').length;

  return (
    <div className="nurse-page">

      {/* Sync Banner */}
      {syncStatus !== 'UP_TO_DATE' && (
        <div className={`sync-banner ${syncStatus === 'OFFLINE' ? 'offline' : syncStatus === 'SYNCING' ? 'syncing' : 'error'}`}>
          {syncStatus === 'OFFLINE' && <><AlertTriangle size={16} /> Working Offline — drafts saved locally</>}
          {syncStatus === 'SYNCING' && <><RefreshCw size={16} className="spin" /> Syncing drafts to server…</>}
          {syncStatus === 'ERROR' && <><AlertTriangle size={16} /> Sync failed. Retrying shortly…</>}
        </div>
      )}

      {/* Hero */}
      <div className="nurse-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p className="nurse-hero-greeting">{t(greetingKey)},</p>
              <h1 className="nurse-hero-name">{firstName} </h1>
              <p className="nurse-hero-dept">{user?.department ?? 'Primary Health Care'} · TRMS Field Agent</p>
            </div>

            <button
              onClick={() => changeLanguage(lang === 'en' ? 'ti' : 'en')}
              className="btn btn-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Globe size={14} />
              {lang === 'en' ? 'ትግርኛ' : 'English'}
            </button>
          </div>

          <div className="nurse-stats">
            <div className="nurse-stat">
              <span className="nurse-stat-val">{loading ? '—' : activeCount}</span>
              <span className="nurse-stat-lbl">{t('active')}</span>
            </div>
            <div className="nurse-stat">
              <span className="nurse-stat-val">{loading ? '—' : referrals.length}</span>
              <span className="nurse-stat-lbl">{t('total')}</span>
            </div>
            <div className="nurse-stat">
              <span className="nurse-stat-val">{loading ? '—' : doneCount}</span>
              <span className="nurse-stat-lbl">{t('done')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Quick Actions */}
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem', color: 'var(--text-main)' }}>{t('quickActions')}</h2>
          <div className="nurse-quick-actions">
            <Link href="/referral/new" className="quick-action-card" style={{ textDecoration: 'none' }}>
              <div className="quick-action-icon blue"><Plus size={22} /></div>
              <div>
                <div className="quick-action-title">{t('newReferral')}</div>
                <div className="quick-action-desc">{t('newReferral.desc')}</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
            </Link>

            <Link href="/nurse/referrals" className="quick-action-card" style={{ textDecoration: 'none' }}>
              <div className="quick-action-icon teal"><ClipboardList size={22} /></div>
              <div>
                <div className="quick-action-title">{t('myReferrals')}</div>
                <div className="quick-action-desc">{t('myReferrals.desc')}</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
            </Link>

            <Link href="/directory" className="quick-action-card" style={{ textDecoration: 'none' }}>
              <div className="quick-action-icon slate"><Hospital size={22} /></div>
              <div>
                <div className="quick-action-title">{t('directory')}</div>
                <div className="quick-action-desc">{t('directory.desc')}</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
            </Link>
          </div>
        </section>

        {/* Recent Referrals */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{t('recentReferrals')}</h2>
            <Link href="/nurse/referrals" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>{t('seeAll')} →</Link>
          </div>

          <div className="card referral-list-card">
            {loading ? (
              <div className="table-loading"><span className="spinner" /> Loading referrals…</div>
            ) : referrals.length === 0 ? (
              <div className="table-empty">
                <Send size={32} style={{ color: 'var(--border-color)' }} />
                <p>No referrals yet.</p>
                <Link href="/referral/new"><button className="btn btn-primary btn-sm">{t('newReferral')}</button></Link>
              </div>
            ) : (
              referrals.slice(0, 5).map(r => (
                <div key={r.id} className="referral-list-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="referral-id">#{r.id}</div>
                    <div className="referral-patient">{r.patient}</div>
                    <div className="referral-meta">
                      <span className={`badge ${PRIORITY_BADGE[r.priority] || 'badge-neutral'}`}>{r.priority}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        <Hospital size={11} /> {r.hospital}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        <Clock size={11} /> {r.time}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[r.status] || 'badge-neutral'}`} style={{ flexShrink: 0 }}>{r.status}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

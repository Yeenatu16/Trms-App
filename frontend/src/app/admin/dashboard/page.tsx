import React from 'react';
import { fetchWithAuth } from '@/lib/api';
import Link from 'next/link';
import {
  Users, Building2, FileText, Clock, CheckCircle2,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

const MOCK_STATS = {
  totalReferrals: 847,
  pendingReferrals: 32,
  acceptedToday: 14,
  activeFacilities: 5,
  priorityBreakdown: { EMERGENCY: 18, URGENT: 35, ROUTINE: 47 },
  statusBreakdown: { SUBMITTED: 32, ACCEPTED: 41, REJECTED: 8, COMPLETED: 19 },
};

const RECENT_ACTIVITY = [
  { id: 1, type: 'referral', msg: 'Emergency referral submitted from Axum HC', time: '2 min ago', color: 'bg-red-500' },
  { id: 2, type: 'accepted', msg: 'Referral #R-0841 accepted by Ayder Hospital', time: '15 min ago', color: 'bg-emerald-500' },
  { id: 3, type: 'user',     msg: 'New nurse account created — Tigist Hailu', time: '1 hr ago', color: 'bg-blue-500' },
  { id: 4, type: 'referral', msg: 'Urgent referral from Suhul Shire to Adigrat', time: '2 hr ago', color: 'bg-amber-500' },
  { id: 5, type: 'completed',msg: 'Referral #R-0836 marked as Completed', time: '3 hr ago', color: 'bg-teal-500' },
];

async function getStats(token?: string) {
  try {
    const res = await fetchWithAuth(`${API_URL}/api/analytics/summary`, { next: { revalidate: 0 } }, token);
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const data = await res.json();
    
    const s = { ...MOCK_STATS, totalReferrals: data.total, acceptedToday: data.accepted, activeFacilities: data.activeFacilities || MOCK_STATS.activeFacilities };
    const pBreakdown = { EMERGENCY: 0, URGENT: 0, ROUTINE: 0 };
    const stBreakdown: Record<string, number> = { SUBMITTED: 0, ACCEPTED: 0, REJECTED: 0, COMPLETED: 0 };
    data.byPriority?.forEach((p: any) => { (pBreakdown as any)[p.priority] = p.count; });
    data.byStatus?.forEach((st: any) => { stBreakdown[st.status] = st.count; });
    s.priorityBreakdown = pBreakdown as any;
    s.statusBreakdown = stBreakdown as any;
    s.pendingReferrals = stBreakdown.SUBMITTED || 0;
    return s;
  } catch (error) {
    console.log("Using fallback analytics data");
    return MOCK_STATS;
  }
}

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('trms_token')?.value;
  const stats = await getStats(token);

  const kpiCards = [
    { label: 'Total Referrals', value: stats.totalReferrals, delta: '+12%', up: true, icon: FileText, colorClass: 'blue' },
    { label: 'Pending Triage', value: stats.pendingReferrals, delta: '+3 today', up: false, icon: Clock, colorClass: 'amber' },
    { label: 'Accepted Today', value: stats.acceptedToday, delta: '+6 vs yesterday', up: true, icon: CheckCircle2, colorClass: 'green' },
    { label: 'Active Facilities', value: stats.activeFacilities, delta: 'All online', up: true, icon: Building2, colorClass: 'teal' },
  ];

  const getPercentage = (val: number) => {
    return stats.totalReferrals ? Math.round((val / stats.totalReferrals) * 100) : 0;
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Regional Health Bureau — Tigray Referral Overview</p>
        </div>
        <div className="dashboard-actions">
          <Link href="/admin/users" className="btn btn-outline">
            <Users size={16} /> Manage Users
          </Link>
          <Link href="/admin/facilities" className="btn btn-primary">
            <Building2 size={16} /> Add Facility
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpiCards.map((k, i) => (
          <div key={i} className="kpi-card glass-card" style={{ padding: '1.5rem', animationDelay: `${i * 0.1}s`, width: 'auto' }}>
            <div className="kpi-header">
              <div className={`kpi-icon ${k.colorClass}`}>
                <k.icon size={20} />
              </div>
              <div className={`kpi-delta ${k.up ? 'up' : 'down'}`}>
                {k.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {k.delta}
              </div>
            </div>
            <div className="kpi-value">{k.value.toLocaleString()}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        {/* Status Distribution */}
        <div className="panel-card glass-card" style={{ padding: 0 }}>
          <div className="panel-header">
            <div className="panel-title">Status Distribution</div>
            <div className="panel-desc">Current state of all tracked referrals</div>
          </div>
          <div className="panel-body">
            <div className="status-bars">
              {[
                { label: 'Submitted', val: stats.statusBreakdown.SUBMITTED || 0, color: '#f59e0b' },
                { label: 'Accepted',  val: stats.statusBreakdown.ACCEPTED || 0, color: '#3b82f6' },
                { label: 'Rejected',  val: stats.statusBreakdown.REJECTED || 0, color: '#ef4444' },
                { label: 'Completed', val: stats.statusBreakdown.COMPLETED || 0, color: '#10b981' },
              ].map(s => {
                const pct = getPercentage(s.val);
                return (
                  <div key={s.label} className="status-row">
                    <div className="status-labels">
                      <span>{s.label}</span>
                      <span style={{ fontWeight: 700 }}>{s.val}</span>
                    </div>
                    <div className="status-track">
                      <div className="status-fill" style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="panel-card glass-card" style={{ padding: 0 }}>
          <div className="panel-header">
            <div className="panel-title">Priority Level</div>
            <div className="panel-desc">Breakdown by medical urgency</div>
          </div>
          <div className="panel-body">
            <div className="priority-list">
              {[
                { label: 'Emergency', val: stats.priorityBreakdown.EMERGENCY, cls: 'red' },
                { label: 'Urgent',    val: stats.priorityBreakdown.URGENT, cls: 'amber' },
                { label: 'Routine',   val: stats.priorityBreakdown.ROUTINE, cls: 'green' },
              ].map(p => (
                <div key={p.label} className={`priority-item ${p.cls}`}>
                  <div>
                    <div className="priority-name">{p.label}</div>
                    <div className="priority-sub">{getPercentage(p.val)}% of total</div>
                  </div>
                  <div className="priority-val">{p.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        {/* Recent Activity */}
        <div className="panel-card glass-card" style={{ padding: 0 }}>
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="panel-title">System Activity</div>
              <div className="panel-desc">Live stream of network actions</div>
            </div>
            <Activity size={18} color="var(--text-muted)" />
          </div>
          <div className="panel-body">
            <div className="activity-list">
              {RECENT_ACTIVITY.map(a => {
                const colorMap: Record<string, string> = {
                  'bg-red-500': '#ef4444', 'bg-emerald-500': '#10b981',
                  'bg-blue-500': '#3b82f6', 'bg-amber-500': '#f59e0b', 'bg-teal-500': '#14b8a6'
                };
                return (
                  <div key={a.id} className="activity-item">
                    <div className="activity-node">
                      <div className="activity-dot" style={{ background: colorMap[a.color] }} />
                      <div className="activity-line" />
                    </div>
                    <div className="activity-text">
                      <p>{a.msg}</p>
                      <span>{a.time}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="panel-card glass-card" style={{ padding: 0 }}>
          <div className="panel-header">
            <div className="panel-title">Quick Actions</div>
            <div className="panel-desc">Shortcut links to management</div>
          </div>
          <div className="panel-body">
            <div className="links-grid">
              <Link href="/admin/users" className="link-card">
                <Users size={20} color="#2563eb" />
                <h3>Manage Users</h3>
                <p>Staff accounts & roles</p>
              </Link>
              <Link href="/admin/facilities" className="link-card">
                <Building2 size={20} color="#0d9488" />
                <h3>Facilities</h3>
                <p>Hospital network registry</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

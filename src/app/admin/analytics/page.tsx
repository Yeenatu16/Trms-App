"use client";
import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { Users, Building2, FileText, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchWithAuth(`${API_URL}/api/analytics/summary`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setSummary(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem', color: 'var(--text-muted)', gap: '1rem' }}>
        <span className="spinner" /> Loading analytics…
      </div>
    );
  }

  const kpis = [
    { label: 'Total Users',      value: summary?.totalUsers      ?? 0, icon: Users,     color: 'blue',  trend: '+12%', up: true },
    { label: 'Total Facilities', value: summary?.totalFacilities ?? 0, icon: Building2, color: 'teal',  trend: '+2',   up: true },
    { label: 'Total Referrals',  value: summary?.totalReferrals  ?? 0, icon: FileText,  color: 'amber', trend: '+18%', up: true },
    { label: 'Active Services',  value: summary?.totalServices   ?? 0, icon: Activity,  color: 'green', trend: 'Stable', up: true },
  ];

  const statusData = summary?.referralsByStatus
    ? Object.entries(summary.referralsByStatus).map(([status, count]) => ({ status, count }))
    : [];

  const facilityData = summary?.referralsByFacility
    ? summary.referralsByFacility.slice(0, 8)
    : [];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Overview</h1>
          <p className="page-subtitle">Real-time network performance and referral metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card card-hover">
            <div className="kpi-header">
              <div className={`kpi-icon ${kpi.color}`}><kpi.icon size={20} /></div>
              <div className={`kpi-delta ${kpi.up ? 'up' : 'down'}`}>
                {kpi.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {kpi.trend}
              </div>
            </div>
            <div className="kpi-value">{kpi.value.toLocaleString()}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid-main">
        {/* Referrals by Status */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Referrals by Status</h3>
          <div className="chart-container">
            {mounted && statusData.length > 0 && (
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="status" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {mounted && statusData.length === 0 && (
              <div className="table-empty" style={{ height: 300 }}>No referral data yet.</div>
            )}
          </div>
        </div>

        {/* Referrals by Facility */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Referrals by Facility</h3>
          <div className="chart-container">
            {mounted && facilityData.length > 0 && (
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <BarChart data={facilityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="facility" type="category" width={120} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {mounted && facilityData.length === 0 && (
              <div className="table-empty" style={{ height: 300 }}>No facility data yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Priority Breakdown */}
      {summary?.referralsByPriority && (
        <div className="chart-wrapper">
          <h3 className="chart-title">Referral Priority Distribution</h3>
          <div className="chart-container">
            {mounted && (
              <ResponsiveContainer width="100%" height={280} debounce={100}>
                <PieChart>
                  <Pie
                    data={Object.entries(summary.referralsByPriority).map(([priority, count]) => ({ priority, count }))}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={110}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="priority"
                  >
                    {Object.entries(summary.referralsByPriority).map(([priority], index) => {
                      const fill = priority === 'EMERGENCY' ? '#ef4444' : priority === 'URGENT' ? '#f59e0b' : '#10b981';
                      return <Cell key={index} fill={fill} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import './reports.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')}/api/analytics/comprehensive`, {
        withCredentials: true
      });
      setData(res.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="spinner"></div>
        <p>Generating reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-error">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <h3>Analytics Unavailable</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="btn btn-primary">Retry</button>
      </div>
    );
  }

  const COLORS = ['#0e71dc', '#14b8a6', '#f59e0b', '#dc2626', '#8b5cf6'];

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <h2>System Analytics & Reports</h2>
          <p>Global network capacity and referral volume metrics.</p>
        </div>
        <div className="reports-actions">
          <select className="reports-filter">
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>Year to Date</option>
          </select>
          <button className="btn btn-primary" onClick={() => window.print()}>Export PDF</button>
        </div>
      </header>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Avg Turnaround Time</div>
          <div className="metric-value">{data.metrics?.avgTurnaroundHours} <span className="metric-unit">hrs</span></div>
          <div className="metric-trend up">↓ 1.2 hrs vs last month</div>
        </div>
        <div className="metric-card metric-danger">
          <div className="metric-label">Network No-Show Rate</div>
          <div className="metric-value">{data.metrics?.noShowRate}</div>
          <div className="metric-trend down">↑ 2.1% vs last month</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Offline Sync Delay (Avg)</div>
          <div className="metric-value">{data.metrics?.offlineSyncDelay}</div>
          <div className="metric-trend up">Stable connection</div>
        </div>
      </div>

      <div className="charts-grid-main">
        {/* Volume by Facility */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Referral Volume by Facility</h3>
          <div className="chart-container">
            {mounted && (
              <ResponsiveContainer width="100%" height={350} debounce={100}>
                <BarChart data={data.volumeByFacility} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="facility" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Volume by Department */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Top Referral Departments (Reasons)</h3>
          <div className="chart-container">
            {mounted && (
              <ResponsiveContainer width="100%" height={350} debounce={100}>
                <BarChart data={data.volumeByDepartment} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="department" type="category" width={110} fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" fill="var(--teal)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="charts-grid-secondary">
        {/* Routing Rates pie */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Global Routing Status</h3>
          <div className="chart-container">
            {mounted && (
              <ResponsiveContainer width="100%" height={350} debounce={100}>
                <PieChart>
                  <Pie
                    data={data.routingRates}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {data.routingRates.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="chart-wrapper">
          <h3 className="chart-title">Acuity Breakdown (Emergency vs Routine)</h3>
          <div className="chart-container">
            {mounted && (
              <ResponsiveContainer width="100%" height={350} debounce={100}>
                <PieChart>
                  <Pie
                    data={data.priorityVolume}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    nameKey="priority"
                  >
                    {data.priorityVolume.map((entry: any, index: number) => {
                      let fill = 'var(--success)';
                      if (entry.priority === 'URGENT') fill = 'var(--warning)';
                      if (entry.priority === 'EMERGENCY') fill = 'var(--danger)';
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

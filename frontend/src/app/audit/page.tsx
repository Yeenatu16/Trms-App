"use client";
import { getApiUrl } from '@/lib/config';
import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import './page.css';

const API_URL = getApiUrl();
const PAGE_SIZE = 20;

// Demo seed when API not available

export default function AuditLogViewer() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/api/audit?page=${page}&limit=50`
      );
      if (res.ok) {
        const d = await res.json();
        setEvents(d.events);
        setTotal(d.total);
      } else throw new Error();
    } catch {
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'Resource ID', 'Details', 'IP Address'],
      ...events.map(e => [
        e.timestamp,
        e.user ? `${e.user.firstName} ${e.user.lastName}` : 'System',
        e.user?.role ?? '—',
        e.action,
        e.resource,
        e.resourceId ?? '—',
        e.details ?? '—',
        e.ipAddress ?? '—',
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trms-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filter
    ? events.filter(e =>
      e.action.includes(filter.toUpperCase()) ||
      e.resource.toLowerCase().includes(filter.toLowerCase()) ||
      (e.user?.email ?? '').toLowerCase().includes(filter.toLowerCase())
    )
    : events;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="audit-container">
      <div className="audit-header">
        <div>
          <h1 className="audit-title gradient-text">Audit Trail</h1>
          <p style={{ color: 'var(--text-muted)' }}>{total.toLocaleString()} total recorded system events</p>
        </div>
        <button className="export-btn" onClick={handleExport}>⬇ Export CSV</button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by action, resource, or user email…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ minWidth: '300px' }}
        />
        <select onChange={e => setFilter(e.target.value)} defaultValue="">
          <option value="">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="STATUS_CHANGE">Status Change</option>
          <option value="CONSENT_CAPTURE">Consent Capture</option>
          <option value="SYNC">Sync</option>
          <option value="VIEW_REFERRAL">View Referral</option>
        </select>
      </div>

      <div className="audit-table-wrap">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center' }}>Loading audit events…</p>
        ) : (
          <>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td>
                      {e.user
                        ? <><strong>{e.user.firstName} {e.user.lastName}</strong><br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.user.email}</span></>
                        : <span style={{ color: 'var(--text-muted)' }}>System</span>
                      }
                    </td>
                    <td style={{ fontSize: '0.78rem' }}>{e.user?.role ?? '—'}</td>
                    <td><span className="action-chip">{e.action}</span></td>
                    <td>{e.resource}</td>
                    <td style={{ maxWidth: '200px', fontSize: '0.82rem' }}>{e.details ?? '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.ipAddress ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <button className="page-btn" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

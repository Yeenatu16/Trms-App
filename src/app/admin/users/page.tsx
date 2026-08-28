"use client";
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '@/lib/api';
import './page.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Dynamically fetched from /api/directory/facilities
type Facility = { id: string; name: string; code: string };

const ROLES = [
  { value: 'NURSE', label: 'Nurse', badge: 'badge-nurse' },
  { value: 'LIAISON_OFFICER', label: 'Liaison Officer', badge: 'badge-liaison' },
  { value: 'ADMINISTRATOR', label: 'Administrator', badge: 'badge-admin' },
];

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  department: string | null;
  sex?: string;
  age?: number | null;
  facility: { name: string } | null;
  facilityId?: string | null;
  createdAt: string;
};

const EMPTY_FORM = {
  id: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'NURSE',
  department: '',
  facilityId: '',
  sex: 'MALE',
  age: '',
  occupationDate: '',
  status: 'ACTIVE',
};

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [formData, setFormData]     = useState({ ...EMPTY_FORM });
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving]         = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  
  const [managingUser, setManagingUser] = useState<User | null>(null);
  const [manageTab, setManageTab] = useState<'VIEW' | 'EDIT' | 'DEACTIVATE' | 'DELETE'>('VIEW');
  const [loggedInAdminId, setLoggedInAdminId] = useState('');


  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users`);
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/api/directory/facilities`);
      if (res.ok) setFacilities(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    fetchUsers();
    fetchFacilities();
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setLoggedInAdminId(payload.sub || payload.userId);
      }
    } catch {}
  }, []);

  const openCreate = () => {
    setFormData({ ...EMPTY_FORM });
    setProfilePreview(null);
    setProfileFile(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openManage = (u: User) => {
    setManagingUser(u);
    setManageTab('VIEW');
    setFormData({
      ...EMPTY_FORM,
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? '',
      role: u.role,
      department: u.department ?? '',
      sex: u.sex ?? 'MALE',
      age: u.age ? String(u.age) : '',
      status: u.status,
      facilityId: u.facilityId ?? '',
    });
    setProfilePreview(null);
    setProfileFile(null);
    setIsEditMode(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isEditMode ? `${API_URL}/api/users/${formData.id}` : `${API_URL}/api/users`;
      const method = isEditMode ? 'PATCH' : 'POST';
      
      // Sanitize payload: only send allowed fields
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        sex: formData.sex,
        age: formData.age ? parseInt(String(formData.age)) : null,
        facilityId: formData.facilityId || null,
        department: formData.department || null,
        phone: formData.phone || null,
        occupationDate: formData.occupationDate || null,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) { 
        setIsModalOpen(false); 
        if (managingUser) setManagingUser(null);
        fetchUsers(); 
      }
      else { const err = await res.json(); alert(err.message || 'Save failed'); }
    } catch { alert('Network error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!managingUser) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/${managingUser.id}`, { method: 'DELETE' });
      if (res.ok) { setManagingUser(null); fetchUsers(); }
      else { const err = await res.json(); alert(err.message || 'Failed to delete user'); }
    } catch { alert('Network error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    if (!managingUser) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/api/users/${managingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' }),
      });
      if (res.ok) { setManagingUser(null); fetchUsers(); }
      else { const err = await res.json(); alert(err.message || 'Failed to deactivate user'); }
    } catch { alert('Network error'); }
    finally { setSaving(false); }
  };

  const set = (k: string, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.facility?.name ?? '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleBadge = (role: string) => ROLES.find(r => r.value === role)?.badge ?? 'badge-neutral';
  const getRoleLabel = (role: string) => ROLES.find(r => r.value === role)?.label ?? role;

  const avatarColor = (name: string) => {
    const colors = ['var(--primary)', 'var(--teal)', 'hsl(245,70%,55%)', 'hsl(330,70%,55%)', 'hsl(38,80%,48%)'];
    let h = 0;
    for (let c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[h];
  };

  return (
    <div className="users-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">RHB Admin — Create and manage all staff accounts</p>
        </div>
        <button className="btn btn-primary" id="create-user-btn" onClick={openCreate}>
          + Create User
        </button>
      </div>

      {/* Filters */}
      <div className="users-filters">
        <div className="search-wrap">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="search-icon">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="form-input search-input"
            placeholder="Search by name, email, facility…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="role-tabs">
          {['ALL', ...ROLES.map(r => r.value)].map(r => (
            <button
              key={r}
              className={`role-tab ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'ALL' ? 'All' : getRoleLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="users-stats">
        <div className="users-stat">
          <span className="users-stat-val">{users.length}</span>
          <span className="users-stat-lbl">Total Users</span>
        </div>
        <div className="users-stat">
          <span className="users-stat-val">{users.filter(u => u.status === 'ACTIVE').length}</span>
          <span className="users-stat-lbl">Active</span>
        </div>
        <div className="users-stat">
          <span className="users-stat-val">{users.filter(u => u.role === 'NURSE').length}</span>
          <span className="users-stat-lbl">Nurses</span>
        </div>
        <div className="users-stat">
          <span className="users-stat-val">{users.filter(u => u.role === 'LIAISON_OFFICER').length}</span>
          <span className="users-stat-lbl">Liaison Officers</span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="table-loading">
            <div className="spinner" style={{ color: 'var(--primary)', width: 28, height: 28, borderWidth: 3 }} />
            <p>Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <span style={{ fontSize: '2rem' }}>👥</span>
            <p>No users found. {search ? 'Try adjusting your search.' : 'Add your first user.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table users-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Hospital / Department</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const initials = `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
                const bg = avatarColor(`${u.firstName}${u.lastName}`);
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }} title={u.id}>
                        {u.id.split('-')[0]}
                      </span>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{ background: bg }}>{initials}</div>
                        <div>
                          <div className="user-name">{u.firstName} {u.lastName}</div>
                          <div className="user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${getRoleBadge(u.role)}`}>{getRoleLabel(u.role)}</span></td>
                    <td>
                      <div className="placement-cell">
                        <span className="placement-name">{u.facility?.name ?? '—'}</span>
                        {u.department && <span className="placement-dept">{u.department}</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem' }}>
                        {u.phone ? <div>{u.phone}</div> : <span className="text-muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                        {u.status === 'ACTIVE' ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex' }}>
                        <button className="btn btn-secondary btn-sm manage-btn" onClick={() => openManage(u)}>
                          <span className="manage-btn-text">Manage</span>
                          <svg className="manage-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal-box" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h2>{isEditMode ? 'Edit User' : 'Create New User'}</h2>
                <p className="text-sm text-muted" style={{ marginTop: '0.2rem' }}>
                  {isEditMode ? 'Update staff account details' : 'Add a new staff member to the network'}
                </p>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body">
                {/* Profile Photo */}
                <div className="photo-upload-section">
                  <div
                    className="photo-preview"
                    style={{ background: profilePreview ? undefined : 'linear-gradient(135deg, var(--primary), var(--teal))' }}
                    onClick={() => fileRef.current?.click()}
                  >
                    {profilePreview
                      ? <img src={profilePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : <span style={{ fontSize: '1.8rem', color: 'white' }}>
                          {formData.firstName?.[0]?.toUpperCase() || '👤'}
                        </span>
                    }
                    <div className="photo-overlay">📷</div>
                  </div>
                  <div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                      Upload Photo
                    </button>
                    <p className="form-hint" style={{ marginTop: '0.3rem' }}>JPG or PNG, max 2 MB</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                </div>

                <hr className="divider" />

                {/* Name Row */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name <span className="form-required">*</span></label>
                    <input required className="form-input" placeholder="e.g. Abebe"
                      value={formData.firstName} onChange={e => set('firstName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name <span className="form-required">*</span></label>
                    <input required className="form-input" placeholder="e.g. Kebede"
                      value={formData.lastName} onChange={e => set('lastName', e.target.value)} />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Email <span className="form-required">*</span></label>
                    <input required type="email" className="form-input" placeholder="user@trms.gov.et"
                      value={formData.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" className="form-input" placeholder="+251 9XX XXX XXX"
                      value={formData.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                </div>

                {/* Password */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">
                    {isEditMode ? 'Password (leave blank to keep)' : 'Password'} {!isEditMode && <span className="form-required">*</span>}
                  </label>
                  <input type="password" className="form-input" placeholder="••••••••" minLength={6}
                    required={!isEditMode}
                    value={formData.password} onChange={e => set('password', e.target.value)} />
                </div>

                <hr className="divider" style={{ marginTop: '1.25rem' }} />

                {/* Demographics */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Sex</label>
                    <select className="form-select" value={formData.sex} onChange={e => set('sex', e.target.value)}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input type="number" className="form-input" placeholder="e.g. 28" min={18} max={80}
                      value={formData.age} onChange={e => set('age', e.target.value)} />
                  </div>
                </div>

                <hr className="divider" style={{ marginTop: '1.25rem' }} />

                {/* Role & Placement */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Role <span className="form-required">*</span></label>
                    <select className="form-select" value={formData.role} onChange={e => set('role', e.target.value)}>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formData.status} onChange={e => set('status', e.target.value)}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      Placement (Facility) {(formData.role === 'LIAISON_OFFICER' || formData.role === 'NURSE') && <span className="form-required">*</span>}
                    </label>
                    <select 
                      className="form-select" 
                      required={formData.role === 'LIAISON_OFFICER' || formData.role === 'NURSE'}
                      value={formData.facilityId} 
                      onChange={e => set('facilityId', e.target.value)}
                    >
                      <option value="">Select facility…</option>
                      {facilities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" placeholder="e.g. Emergency, ICU"
                      value={formData.department} onChange={e => set('department', e.target.value)} />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Occupation / Start Date</label>
                  <input type="date" className="form-input"
                    value={formData.occupationDate} onChange={e => set('occupationDate', e.target.value)} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : (isEditMode ? 'Save Changes' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Manage User Drawer ── */}
      {managingUser && (
        <div className="manage-drawer-overlay" onClick={e => { if (e.target === e.currentTarget) setManagingUser(null); }}>
          <div className="manage-drawer">
            <div className="manage-drawer-header">
              <div>
                <h2>Manage User</h2>
                <p className="text-sm text-muted" style={{ marginTop: '0.2rem' }}>
                  {managingUser.firstName} {managingUser.lastName}
                </p>
              </div>
              <button className="modal-close" onClick={() => setManagingUser(null)}>✕</button>
            </div>

            <div className="manage-drawer-tabs">
              <button className={`drawer-tab ${manageTab === 'VIEW' ? 'active' : ''}`} onClick={() => setManageTab('VIEW')}>Summary</button>
              <button className={`drawer-tab ${manageTab === 'EDIT' ? 'active' : ''}`} onClick={() => setManageTab('EDIT')}>Edit</button>
              <button className={`drawer-tab ${manageTab === 'DEACTIVATE' ? 'active' : ''}`} onClick={() => setManageTab('DEACTIVATE')}>Deactivate</button>
              <button className={`drawer-tab danger ${manageTab === 'DELETE' ? 'active' : ''}`} onClick={() => setManageTab('DELETE')}>Delete</button>
            </div>

            <div className="manage-drawer-body">
              {manageTab === 'VIEW' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="grid-2">
                    <div>
                      <span className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Full Name</span>
                      <p style={{ fontWeight: 600 }}>{managingUser.firstName} {managingUser.lastName}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Email</span>
                      <p>{managingUser.email}</p>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div>
                      <span className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Role</span>
                      <p><span className={`badge ${getRoleBadge(managingUser.role)}`}>{getRoleLabel(managingUser.role)}</span></p>
                    </div>
                    <div>
                      <span className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Status</span>
                      <p>{managingUser.status}</p>
                    </div>
                  </div>
                  <div className="grid-2">
                    <div>
                      <span className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Facility</span>
                      <p>{managingUser.facility?.name ?? '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted" style={{ textTransform: 'uppercase' }}>Department</span>
                      <p>{managingUser.department || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {manageTab === 'EDIT' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSave(e); }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">First Name</label>
                      <input required className="form-input" value={formData.firstName} onChange={e => set('firstName', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name</label>
                      <input required className="form-input" value={formData.lastName} onChange={e => set('lastName', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input required type="email" className="form-input" value={formData.email} onChange={e => set('email', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-select" value={formData.role} onChange={e => set('role', e.target.value)}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={formData.status} onChange={e => set('status', e.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input type="tel" className="form-input" value={formData.phone} onChange={e => set('phone', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {manageTab === 'DEACTIVATE' && (
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Deactivate User</h3>
                  <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
                    Setting this user to inactive will immediately revoke their access to the system. Their history and records will remain intact.
                  </p>
                  <button className="btn btn-secondary" onClick={handleDeactivate} disabled={saving || managingUser.status === 'INACTIVE'}>
                    {managingUser.status === 'INACTIVE' ? 'User is already inactive' : 'Set to Inactive'}
                  </button>
                </div>
              )}

              {manageTab === 'DELETE' && (
                <div className="danger-box">
                  <h3>Danger Zone: True Removal</h3>
                  <p>
                    This action permanently removes the user account from the primary database.
                  </p>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleDelete} 
                    disabled={saving || managingUser.id === loggedInAdminId}
                  >
                    {managingUser.id === loggedInAdminId ? 'Cannot delete your own account' : 'Permanently Delete User'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

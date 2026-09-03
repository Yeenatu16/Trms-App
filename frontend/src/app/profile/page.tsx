"use client";
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import './profile.css';
import { Camera, Edit2, Shield, User, Building2, Sliders, Activity, Info } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Administrator',
  NURSE: 'Nurse',
  LIAISON_OFFICER: 'Liaison Officer',
};
const ROLE_BADGE: Record<string, string> = {
  ADMINISTRATOR: 'badge-admin',
  NURSE: 'badge-nurse',
  LIAISON_OFFICER: 'badge-liaison',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

function ProfileContent() {
  const { user, logout, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  
  // URL params can trigger open states
  const editParam = searchParams.get('edit') === 'true';
  const tabParam = searchParams.get('tab');

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [dept, setDept]           = useState('');
  const [age, setAge]             = useState('');
  const [sex, setSex]             = useState('UNKNOWN');

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading]     = useState(false);
  const [message, setMessage]     = useState({ type: '', text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setDept(user.department || '');
      setSex(user.sex || 'UNKNOWN');
      setAge(user.age ? String(user.age) : '');
    }
  }, [user]);

  useEffect(() => {
    if (editParam) setIsEditing(true);
    if (tabParam === 'security') setIsChangingPassword(true);
  }, [editParam, tabParam]);

  if (!user) return null;

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  const role = ROLE_LABELS[user.role] ?? user.role;
  const badgeClass = ROLE_BADGE[user.role] ?? 'badge-neutral';

  const showMsg = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pass)) return 'Add at least one uppercase letter.';
    if (!/[0-9]/.test(pass)) return 'Add at least one number.';
    if (!/[!@#$%^&*()]/.test(pass)) return 'Add at least one special character (!@#$%^&*()).';
    return null;
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.patch(`${API_URL}/api/users/profile`, {
        firstName, lastName, phone, department: dept, sex, age: age ? parseInt(age) : null
      }, { withCredentials: true });
      await refreshUser();
      showMsg('success', 'Profile updated successfully.');
      setIsEditing(false);
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validatePassword(newPassword);
    if (error) return showMsg('error', error);
    if (newPassword !== confirmPassword) return showMsg('error', 'Passwords do not match.');

    setLoading(true);
    try {
      await axios.patch(`${API_URL}/api/users/profile/password`, {
        currentPassword, newPassword
      }, { withCredentials: true });
      showMsg('success', 'Password changed successfully.');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/users/profile/photo`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      showMsg('success', 'Photo uploaded successfully.');
    } catch (err: any) {
      showMsg('error', 'Failed to upload photo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page animate-fade-in">
      {message.text && (
        <div style={{ position: 'fixed', top: '5rem', right: '1rem', zIndex: 1000 }} className={`toast-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Hero Section */}
      <div className="profile-hero">
        <div className="profile-hero-bg" />
        <div className="profile-hero-content">
          <div className="profile-avatar-xl" onClick={() => fileInputRef.current?.click()} title="Change Photo">
            {user.profilePicture ? (
              <img src={`${API_URL}${user.profilePicture}`} alt="Avatar" className="avatar-img" />
            ) : initials}
            <div className="avatar-overlay">
              <Camera size={14} />
            </div>
          </div>
          <input type="file" ref={fileInputRef} hidden onChange={handlePhotoUpload} accept="image/*" />
          
          <div className="profile-hero-info">
            <div className="profile-name-role-wrap">
              <h1 className="profile-name">{user.firstName} {user.lastName}</h1>
              <span className={`badge ${badgeClass}`}>{role}</span>
            </div>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="profile-content-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card: Personal Details */}
          <div className="profile-card">
            <div className="profile-section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} className="text-primary" /> Personal Information
              </div>
              {!isEditing && (
                <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                  <Edit2 size={14} /> Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Sex</label>
                    <select className="form-select" value={sex} onChange={e => setSex(e.target.value)}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="UNKNOWN">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input className="form-input" type="number" value={age} onChange={e => setAge(e.target.value)} min={0} max={130} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" placeholder="+251 9XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div className="form-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info-list">
                <div className="info-row">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{user.firstName} {user.lastName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{user.phone || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Sex</span>
                  <span className="info-value">{user.sex || '—'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Age</span>
                  <span className="info-value">{user.age || '—'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Work Information */}
          <div className="profile-card">
            <div className="profile-section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={18} className="text-teal" /> Work Information
              </div>
            </div>
            <div className="profile-info-list">
              <div className="info-row">
                <span className="info-label">Organization</span>
                <span className="info-value">Tigray Regional Health Bureau</span>
              </div>
              <div className="info-row">
                <span className="info-label">Assigned Facility</span>
                <span className="info-value">
                  {user.facilityId ? (
                    <span className="text-primary">{user.facilityId}</span>
                  ) : 'No facility assigned'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Department</span>
                <span className="info-value">{user.department || 'General Practice'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Role Access</span>
                <span className="info-value">{role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Card: Security */}
          <div className="profile-card">
            <div className="profile-section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} className="text-danger" /> Security Settings
              </div>
              {!isChangingPassword && (
                <button className="btn btn-outline btn-sm" onClick={() => setIsChangingPassword(true)}>
                  Change Password
                </button>
              )}
            </div>

            {isChangingPassword ? (
              <form onSubmit={handlePasswordChange} className="profile-form">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input className="form-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Must effectively be 8+ chars, uppercase, number & symbol</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                <div className="form-actions-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsChangingPassword(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>Update Password</button>
                </div>
              </form>
            ) : (
              <div className="profile-info-list" style={{ marginBottom: '1rem' }}>
                <div className="info-row">
                  <span className="info-label">Password Last Changed</span>
                  <span className="info-value">
                    {(user as any).lastPasswordChange ? new Date((user as any).lastPasswordChange).toLocaleDateString() : 'Never'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Two-Factor Auth</span>
                  <span className="info-value text-muted">Not enabled</span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Preferences */}
          <div className="profile-card">
            <div className="profile-section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} className="text-warning" /> Preferences
              </div>
            </div>
            <div className="profile-info-list">
              <div className="info-row">
                <span className="info-label">Email Notifications</span>
                <span className="info-value">Enabled</span>
              </div>
              <div className="info-row">
                <span className="info-label">System Theme</span>
                <span className="info-value">Light (Default)</span>
              </div>
            </div>
          </div>

          {/* Card: Account Status */}
          <div className="profile-card">
            <div className="profile-section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} className="text-success" /> Account Activity
              </div>
            </div>
             <div className="profile-info-list">
              <div className="info-row">
                <span className="info-label">Account Status</span>
                <span className="info-value text-success" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span className="status-dot dot-operational"></span> Active
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Joined TRMS</span>
                <span className="info-value">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  )
}

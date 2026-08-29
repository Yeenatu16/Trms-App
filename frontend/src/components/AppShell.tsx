"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AppFooter from './AppFooter';

import {
  LayoutDashboard, Users, Building2, BarChart2,
  Clipboard, List, Hospital, Send, Bell, Paperclip, FileText,
  Activity, AlertTriangle, MessageSquare, BedDouble,
  LogOut, ChevronLeft, ChevronRight, RefreshCw, Wifi, WifiOff, Menu, X
} from 'lucide-react';

/* ── Nav definitions per role ── */
const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',       icon: Users },
  { href: '/admin/facilities',label: 'Facilities',  icon: Building2 },
  // Referrals removed per your requirement
  { href: '/admin/analytics', label: 'Analytics',   icon: BarChart2 },
  { href: '/admin/reports',   label: 'Reports',     icon: Clipboard },
  { href: '/audit',           label: 'Audit Log',   icon: List },
  { href: '/directory',       label: 'Registry',    icon: Hospital },
];

const NURSE_NAV = [
  { href: '/nurse',              label: 'New Referral',  icon: Send },
  { href: '/nurse/referrals',    label: 'My Referrals',  icon: FileText },
  { href: '/directory',          label: 'Directory',     icon: Hospital },
  { href: '/nurse/notifications',label: 'Notifications', icon: Bell },
];

const LIAISON_NAV = [
  { href: '/liaison',          label: 'Incoming Referrals', icon: Activity },
  { href: '/liaison/triage',   label: 'Triage Queue',       icon: AlertTriangle },
  { href: '/liaison/capacity', label: 'Bed Capacity',       icon: BedDouble },
  { href: '/directory',        label: 'Clinical Directory', icon: Hospital },
];

const NO_SHELL_PATHS = ['/'];

function getNav(role?: string) {
  if (role === 'ADMINISTRATOR')   return ADMIN_NAV;
  if (role === 'NURSE')           return NURSE_NAV;
  if (role === 'LIAISON_OFFICER') return LIAISON_NAV;
  return [];
}

function getHomeRoute(role?: string) {
  if (role === 'ADMINISTRATOR')   return '/admin/dashboard';
  if (role === 'NURSE')           return '/nurse';
  if (role === 'LIAISON_OFFICER') return '/liaison';
  return '/';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'offline'>('offline');
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoading && !user && !NO_SHELL_PATHS.includes(pathname)) {
      router.push('/');
    }
  }, [user, isLoading, pathname, router]);

  // WebSocket connection tracking
  useEffect(() => {
    if (NO_SHELL_PATHS.includes(pathname)) return;
    let socket: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const io = require('socket.io-client');
      socket = io('http://localhost:3001', { transports: ['websocket'], reconnectionAttempts: 5 });
      socket.on('connect',    () => { setWsConnected(true);  setSyncStatus('synced') });
      socket.on('disconnect', () => { setWsConnected(false); setSyncStatus('offline') });
      socket.on('syncing',    () => setSyncStatus('pending'));
      socket.on('synced',     () => setSyncStatus('synced'));
    } catch { /* dev fallback */ }
    return () => socket?.disconnect();
  }, [pathname]);

  if (NO_SHELL_PATHS.includes(pathname)) return <>{children}</>;

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading TRMS...</p>
      </div>
    );
  }

  if (!user) return null;

  const nav = getNav(user.role);
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  const pageTitle = nav.find(n => pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href)))?.label ?? 'TRMS';

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Hospital size={16} color="white" />
          </div>
          <div className="sidebar-brand">
            <span>TRMS</span>
            <small>Health Bureau</small>
          </div>
          <button className="sidebar-toggle desktop-only" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button className="sidebar-toggle mobile-only" onClick={() => setMobileOpen(false)}>
            <X size={20} color="white" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {nav.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`nav-item ${isActive ? 'active' : ''}`} 
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sidebar-text)', opacity: 0.7 }}>
          <Hospital size={16} />
          {!collapsed && <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>TRMS v1.0</span>}
        </div>
      </aside>

      {/* Main Container */}
      <main className="app-main">
        {/* Header */}
        <header className="app-header">
          <div className="app-header-left">
            <button className="mobile-hamburger" onClick={() => setMobileOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="app-header-title">{pageTitle}</div>
          </div>
          
          <div className="app-header-right">
            <div className="header-indicators desktop-only">
              <div className={`indicator-badge ${wsConnected ? 'connected' : 'disconnected'}`} title="Real-time Status">
                {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>{wsConnected ? 'Live' : 'Offline'}</span>
              </div>
              <div className={`indicator-badge ${syncStatus === 'synced' ? 'synced' : syncStatus === 'pending' ? 'syncing' : 'no-sync'}`} title="Sync Status">
                <RefreshCw size={14} className={syncStatus === 'pending' ? 'spin' : ''} />
                <span>{syncStatus === 'synced' ? 'Synced' : syncStatus === 'pending' ? 'Syncing...' : 'No sync'}</span>
              </div>
            </div>

            <div className="header-dropdown-container" ref={dropdownRef}>
              <button className="header-profile-toggle" onClick={() => setShowDropdown(!showDropdown)}>
                <div className="avatar">
                  {user.profilePicture ? (
                    <img 
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${user.profilePicture}`} 
                      alt="Avatar" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : initials}
                </div>
                <div className="user-info desktop-only">
                  <p>{(`${user.firstName ?? ''} ${user.lastName ?? ''}`).trim() || user.email}</p>
                  <span className="badge-role">{user.role}</span>
                </div>
              </button>

              {showDropdown && (
                <div className="header-dropdown-menu">
                  <Link href="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>View Profile</Link>
                  <Link href="/profile?edit=true" className="dropdown-item" onClick={() => setShowDropdown(false)}>Edit Profile</Link>
                  <Link href="/profile?tab=security" className="dropdown-item" onClick={() => setShowDropdown(false)}>Account Settings</Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item text-danger" onClick={() => { setShowDropdown(false); logout(); }}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="app-content">
          {children}
        </div>

        {/* Global Footer */}
        <AppFooter />
      </main>
    </div>
  );
}

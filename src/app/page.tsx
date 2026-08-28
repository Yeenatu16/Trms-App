"use client";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Eye, EyeOff, Hospital, Lock, Mail, User,
  LogIn, UserPlus, AlertTriangle, CheckCircle
} from "lucide-react";
import AppFooter from "@/components/AppFooter";
import "./page.css";

type Tab = "signin" | "signup";

const ROLES = [
  { icon: "🏥", title: "Administrator", desc: "System-wide management & analytics" },
  { icon: "💊", title: "Nurse", desc: "Create & track referrals offline-first" },
  { icon: "🤝", title: "Liaison Officer", desc: "Triage, receive and update referrals" },
];

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const switchTab = (t: Tab) => {
    setTab(t); setError(""); setSuccess("");
    setName(""); setEmail(""); setPassword(""); setConfirmPassword(""); setAuthCode("");
    setShowPw(false); setShowCPw(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (tab === "signup") {
      if (!email.toLowerCase().endsWith("@trms.gov.et")) return setError("Email must be an official @trms.gov.et address.");
      if (password !== confirmPassword) return setError("Passwords do not match.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (!authCode.trim()) return setError("Authorization code is required.");
    }
    setIsLoading(true);
    try {
      if (tab === "signin") {
        await login(email, password);
      } else {
        await signup(name, email, password, "ADMINISTRATOR", authCode);
        setSuccess("Admin account created! Redirecting to dashboard…");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Something went wrong.";
      setError(Array.isArray(msg) ? msg.join(" ") : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-root">

      {/* ── LEFT PANEL — Brand & Info ── */}
      <aside className="auth-panel-left">
        <div className="auth-left-pattern" />
        <div className="auth-left-content">


          {/* Hero */}
          <div className="auth-hero-text">
            <h1>Tigray Referral Management System</h1>
            <p>Coordinating critical patient transfers securely and in real-time across the Tigray regional health.</p>
          </div>

          {/* Roles */}
          <div className="auth-roles-preview">
            {ROLES.map(r => (
              <div key={r.title} className="auth-role-chip">
                <span>{r.icon}</span>
                <div>
                  <strong>{r.title}</strong>
                  <span>{r.desc}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </aside>

      {/* ── RIGHT PANEL — Form ── */}
      <main className="auth-panel-right">
        <div className="auth-form-card">

          {/* Title */}
          <div className="auth-form-header">
            <div className="auth-form-title">
              {tab === "signin" ? "Welcome Back" : "Admin Registration"}
            </div>
            <div className="auth-form-sub">
              {tab === "signin"
                ? "Sign in to access your TRMS portal"
                : "Restricted access — authorized personnel only"}
            </div>
          </div>

          {/* Admin-only notice */}
          {tab === "signup" && (
            <div className="auth-admin-notice">
              <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0 }} />
              <div>
                <strong>Security Notice:</strong>{" "}
                <span>All administrator actions are logged and monitored. Unauthorized access is prohibited.</span>
              </div>
            </div>
          )}

          {/* Error / Success */}
          {error && <div className="auth-error"><AlertTriangle size={14} />{error}</div>}
          {success && <div className="auth-success"><CheckCircle size={14} />{success}</div>}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {tab === "signup" && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-name">Full Name</label>
                <div className="auth-input-wrap">
                  <User size={16} className="auth-input-icon" />
                  <input className="auth-input" id="reg-name" type="text"
                    placeholder="Dr. Abebe Kebede"
                    value={name} onChange={e => setName(e.target.value)}
                    required autoComplete="name" />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-email">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input className="auth-input" id="auth-email" type="email"
                  placeholder={tab === "signup" ? "admin@trms.gov.et" : "user@trms.gov.et"}
                  value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input className="auth-input" id="auth-password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required minLength={8}
                  autoComplete={tab === "signin" ? "current-password" : "new-password"}
                  style={{ paddingRight: "2.8rem" }} />
                <button type="button" className="auth-eye-btn" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {tab === "signup" && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-confirm">Confirm Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input className="auth-input" id="auth-confirm"
                    type={showCPw ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    required minLength={8}
                    autoComplete="new-password"
                    style={{ paddingRight: "2.8rem" }} />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowCPw(!showCPw)} tabIndex={-1}>
                    {showCPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {tab === "signup" && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-code">Authorization Code</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input className="auth-input" id="auth-code" type="password"
                    placeholder="Enter admin verification code"
                    value={authCode} onChange={e => setAuthCode(e.target.value)}
                    required />
                </div>
              </div>
            )}

            <button type="submit"
              className={`auth-submit ${tab === "signup" ? "auth-submit-admin" : ""}`}
              disabled={isLoading}>
              {isLoading ? (
                <><span className="auth-spinner" />{tab === "signin" ? "Signing In…" : "Creating Account…"}</>
              ) : (
                <>{tab === "signin" ? <LogIn size={18} /> : <UserPlus size={18} />}{tab === "signin" ? "Sign In to TRMS" : "Create Admin Account"}</>
              )}
            </button>
          </form>

          {/* ── Secondary Admin Link ── */}
          <div className="auth-alt-action">
            {tab === "signin" ? (
              <button type="button" onClick={() => switchTab("signup")} className="auth-toggle-link">
                Administrator? Create account
              </button>
            ) : (
              <button type="button" onClick={() => switchTab("signin")} className="auth-toggle-link">
                Back to Sign In
              </button>
            )}
          </div>

          {/* Shared institutional footer */}
          <AppFooter />

        </div>
      </main>
    </div>
  );
}

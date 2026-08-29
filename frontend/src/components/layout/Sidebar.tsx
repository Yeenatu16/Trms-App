"use client"
import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Building2, FileText, BarChart2,
  Clipboard, AlertTriangle, BedDouble, MessageSquare,
  Send, Bell, Paperclip, List, Activity, LogOut,
  ChevronLeft, ChevronRight, Wifi, WifiOff, RefreshCw,
  Hospital, Menu, X
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string
}

const adminNav: NavItem[] = [
  { label: "Dashboard",     href: "/admin",           icon: <LayoutDashboard size={18} /> },
  { label: "Users",         href: "/admin/users",     icon: <Users size={18} /> },
  { label: "Facilities",    href: "/admin/facilities", icon: <Building2 size={18} /> },
  { label: "Referrals",     href: "/admin/referrals", icon: <FileText size={18} /> },
  { label: "Analytics",     href: "/admin/analytics", icon: <BarChart2 size={18} /> },
  { label: "Reports",       href: "/admin/reports",   icon: <Clipboard size={18} /> },
  { label: "Audit Logs",    href: "/admin/audit",     icon: <List size={18} /> },
  { label: "Directory",     href: "/directory",       icon: <Hospital size={18} /> },
]

const nurseNav: NavItem[] = [
  { label: "New Referral",  href: "/nurse",              icon: <Send size={18} /> },
  { label: "My Referrals",  href: "/nurse/referrals",    icon: <FileText size={18} /> },
  { label: "Directory",     href: "/directory",          icon: <Hospital size={18} /> },
  { label: "Notifications", href: "/nurse/notifications",icon: <Bell size={18} /> },
]

const liaisonNav: NavItem[] = [
  { label: "Incoming",      href: "/liaison",               icon: <Activity size={18} /> },
  { label: "Triage Queue",  href: "/liaison/triage",        icon: <AlertTriangle size={18} /> },
  { label: "Clinical Notes",href: "/liaison/notes",         icon: <MessageSquare size={18} /> },
  { label: "Capacity",      href: "/liaison/capacity",      icon: <BedDouble size={18} /> },
  { label: "Pre-Register",  href: "/liaison/preregister",   icon: <Clipboard size={18} /> },
  { label: "Feedback",      href: "/liaison/feedback",      icon: <Bell size={18} /> },
  { label: "Directory",     href: "/directory",             icon: <Hospital size={18} /> },
]

interface SidebarProps {
  role: "ADMINISTRATOR" | "NURSE" | "LIAISON_OFFICER"
  collapsed: boolean
  onToggle: () => void
}

// Status indicator for WebSocket + PouchDB sync
export function StatusBar({
  wsConnected,
  syncStatus,
}: {
  wsConnected: boolean
  syncStatus: "synced" | "pending" | "offline"
}) {
  return (
    <div className="flex items-center gap-3 px-3">
      {/* WebSocket */}
      <div className="flex items-center gap-1.5" title={wsConnected ? "Real-time connected" : "Real-time disconnected"}>
        {wsConnected
          ? <Wifi size={13} className="text-emerald-400" />
          : <WifiOff size={13} className="text-red-400 animate-pulse" />}
        <span className={cn("text-[10px] font-medium", wsConnected ? "text-emerald-400" : "text-red-400")}>
          {wsConnected ? "Live" : "Offline"}
        </span>
      </div>

      {/* PouchDB sync */}
      <div className="flex items-center gap-1.5" title={`Sync: ${syncStatus}`}>
        <RefreshCw
          size={13}
          className={cn(
            syncStatus === "synced"  && "text-emerald-400",
            syncStatus === "pending" && "text-amber-400 animate-spin",
            syncStatus === "offline" && "text-slate-400",
          )}
        />
        <span className={cn(
          "text-[10px] font-medium",
          syncStatus === "synced"  && "text-emerald-400",
          syncStatus === "pending" && "text-amber-400",
          syncStatus === "offline" && "text-slate-400",
        )}>
          {syncStatus === "synced" ? "Synced" : syncStatus === "pending" ? "Syncing…" : "No sync"}
        </span>
      </div>
    </div>
  )
}

export function Sidebar({ role, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  const navItems =
    role === "ADMINISTRATOR" ? adminNav :
    role === "NURSE"         ? nurseNav :
    liaisonNav

  return (
    <motion.div
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-slate-900 text-white flex-shrink-0 overflow-hidden z-20"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-700/60 flex-shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1v14M1 8h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="text-sm font-bold tracking-wide">TRMS</div>
              <div className="text-[10px] text-slate-400 leading-none">Health Bureau</div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="ml-auto text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Role badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {role === "ADMINISTRATOR" ? "Admin" : role === "NURSE" ? "Nurse" : "Liaison Officer"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href) && item.href !== "/admin" || pathname === item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && !collapsed && (
                <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 pb-4 border-t border-slate-700/60">
        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  )
}

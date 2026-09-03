import { getApiUrl } from '@/lib/config';
"use client"
import React from "react"
import { Bell, Menu } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { StatusBar } from "./Sidebar"

interface HeaderProps {
  title: string
  onMobileMenuToggle: () => void
  wsConnected: boolean
  syncStatus: "synced" | "pending" | "offline"
}

export function Header({ title, onMobileMenuToggle, wsConnected, syncStatus }: HeaderProps) {
  const { user } = useAuth()

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U"

  const roleName =
    user?.role === "ADMINISTRATOR"   ? "Admin" :
    user?.role === "NURSE"           ? "Nurse" :
    user?.role === "LIAISON_OFFICER" ? "Liaison Officer" : "User"

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-4 flex-shrink-0 z-10">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden text-slate-500 hover:text-slate-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <h1 className="text-base font-semibold text-slate-800 truncate">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        {/* Connection indicators */}
        <div className="hidden sm:block">
          <StatusBar wsConnected={wsConnected} syncStatus={syncStatus} />
        </div>

        {/* Notification bell */}
        <button className="relative text-slate-500 hover:text-slate-800 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5">
          {user?.profilePicture ? (
            <img 
              src={`${getApiUrl()}${user.profilePicture}`} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full object-cover border border-slate-200" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
          )}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-800 leading-none">
              {user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "Guest"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{roleName}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

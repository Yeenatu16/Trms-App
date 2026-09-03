"use client"
import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { useAuth } from "@/context/AuthContext"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppLayout({ children, title = "TRMS" }: AppLayoutProps) {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [syncStatus, setSyncStatus] = useState<"synced" | "pending" | "offline">("offline")

  const role = (user?.role ?? "NURSE") as "ADMINISTRATOR" | "NURSE" | "LIAISON_OFFICER"

  // WebSocket connection indicator
  useEffect(() => {
    let socket: any = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const io = require("socket.io-client")
      socket = io((process.env.NEXT_PUBLIC_API_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')), { transports: ["websocket"], reconnectionAttempts: 5 })
      socket.on("connect",    () => { setWsConnected(true);  setSyncStatus("synced")  })
      socket.on("disconnect", () => { setWsConnected(false); setSyncStatus("offline") })
      socket.on("syncing",    () => { setSyncStatus("pending") })
      socket.on("synced",     () => { setSyncStatus("synced")  })
    } catch {
      // socket.io not available or server not running
    }
    return () => { socket?.disconnect() }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar — desktop */}
      <div className="hidden lg:flex">
        <Sidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="fixed left-0 top-0 z-40 h-full lg:hidden"
            >
              <Sidebar role={role} collapsed={false} onToggle={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          title={title}
          onMobileMenuToggle={() => setMobileOpen(true)}
          wsConnected={wsConnected}
          syncStatus={syncStatus}
        />
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-6 h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

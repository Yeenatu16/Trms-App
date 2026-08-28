import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'TRMS – Tigray Referral Management System',
  description: 'Modern healthcare referral management for Tigray Region Health Bureau',
  keywords: 'healthcare, referral, Tigray, Ethiopia, medical',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-slate-50 text-slate-900 antialiased">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

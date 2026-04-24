import { AuthProvider } from '@/context/AuthContext'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'HireSync AI',
    template: '%s | HireSync AI',
  },
  description: 'A modern hiring workspace for jobs, candidate review, AI-assisted screening, and team collaboration.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

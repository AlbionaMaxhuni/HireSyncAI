import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/server-auth'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin('/admin')

  return children
}

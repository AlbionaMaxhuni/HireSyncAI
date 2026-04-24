import { NextResponse } from 'next/server'
import { getOptionalServerUserWithRole } from '@/lib/server-auth'

export const runtime = 'nodejs'

export async function GET() {
  const { user, role, workspace } = await getOptionalServerUserWithRole()

  if (!user) {
    return NextResponse.json({ role: null, workspace: null })
  }

  return NextResponse.json({ role, workspace })
}

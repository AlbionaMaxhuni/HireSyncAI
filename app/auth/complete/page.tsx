import { redirect } from 'next/navigation'
import { getSafeNextPath } from '@/lib/auth-flow'
import { acceptWorkspaceInvite, getServerUserRole, requireAuthenticatedUser } from '@/lib/server-auth'

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; next?: string }>
}) {
  const { user } = await requireAuthenticatedUser('/auth/complete')
  const resolvedSearchParams = await searchParams
  const inviteCode = resolvedSearchParams.invite?.trim()
  const nextPath = getSafeNextPath(resolvedSearchParams.next, '/auth/complete')

  if (inviteCode) {
    const acceptance = await acceptWorkspaceInvite(user, inviteCode)

    if (!acceptance.ok) {
      if (acceptance.reason === 'email_mismatch') {
        redirect('/applications?message=invite_email_mismatch')
      }

      redirect('/applications?message=invite_invalid')
    }

    redirect('/admin/team?message=invite_accepted')
  }

  if (nextPath !== '/auth/complete') {
    redirect(nextPath)
  }

  const role = await getServerUserRole(user)

  if (role === 'admin') {
    redirect('/admin')
  }

  redirect('/applications')
}

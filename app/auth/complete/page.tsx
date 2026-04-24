import { redirect } from 'next/navigation'
import { acceptWorkspaceInvite, getServerUserRole, requireAuthenticatedUser } from '@/lib/server-auth'

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { user } = await requireAuthenticatedUser('/auth/complete')
  const resolvedSearchParams = await searchParams
  const inviteCode = resolvedSearchParams.invite?.trim()

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

  const role = await getServerUserRole(user)

  if (role === 'admin') {
    redirect('/admin')
  }

  redirect('/applications')
}

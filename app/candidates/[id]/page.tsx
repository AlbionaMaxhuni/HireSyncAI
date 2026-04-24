import { redirect } from 'next/navigation'

export default async function LegacyCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/admin/candidates/${id}`)
}

import { normalizeCandidateStage, type CandidateStage } from '@/lib/hiring'

type CandidateEmailInput = {
  candidateName: string
  jobTitle: string
  companyName: string
  stage: CandidateStage | string | null | undefined
}

type InviteEmailInput = {
  workspaceName: string
  inviteLink: string
  inviterName: string
}

export function buildMailtoHref(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    subject,
    body,
  })

  return `mailto:${encodeURIComponent(to)}?${params.toString()}`
}

export function buildCandidateStatusEmail({
  candidateName,
  jobTitle,
  companyName,
  stage,
}: CandidateEmailInput) {
  const resolvedStage = normalizeCandidateStage(stage)
  const safeCandidateName = candidateName.trim() || 'there'
  const safeCompanyName = companyName.trim() || 'our team'
  const safeJobTitle = jobTitle.trim() || 'the role'

  switch (resolvedStage) {
    case 'interview':
      return {
        subject: `Interview invitation for ${safeJobTitle} at ${safeCompanyName}`,
        body: `Hi ${safeCandidateName},

Thank you for applying to the ${safeJobTitle} role at ${safeCompanyName}.

We would like to invite you to the next step of the process: an interview with our team. Please reply with a few time slots that work for you over the next few days, and we will coordinate the meeting.

If you have any questions before the interview, feel free to reply to this message.

Best regards,
${safeCompanyName}`,
      }
    case 'final':
      return {
        subject: `Final stage update for ${safeJobTitle} at ${safeCompanyName}`,
        body: `Hi ${safeCandidateName},

Thank you again for your time throughout the hiring process for the ${safeJobTitle} role at ${safeCompanyName}.

We would like to move you into the final stage of our process. We will share the final interview or decision details with you shortly.

Please keep an eye on your inbox, and feel free to reply if you have any scheduling constraints.

Best regards,
${safeCompanyName}`,
      }
    case 'hired':
      return {
        subject: `Next steps for your ${safeJobTitle} application at ${safeCompanyName}`,
        body: `Hi ${safeCandidateName},

We are pleased to let you know that we would like to move forward with you for the ${safeJobTitle} role at ${safeCompanyName}.

We will follow up with the next steps, including the final details needed to complete the process.

Thank you for your time and interest in joining our team.

Best regards,
${safeCompanyName}`,
      }
    case 'rejected':
      return {
        subject: `Update on your ${safeJobTitle} application at ${safeCompanyName}`,
        body: `Hi ${safeCandidateName},

Thank you for the time and effort you invested in your application for the ${safeJobTitle} role at ${safeCompanyName}.

After review, we have decided not to move forward with your application for this position. We appreciate your interest in our team and wish you the best in your next steps.

Thank you again for applying.

Best regards,
${safeCompanyName}`,
      }
    case 'screening':
      return {
        subject: `Your ${safeJobTitle} application is under review at ${safeCompanyName}`,
        body: `Hi ${safeCandidateName},

Thank you for applying to the ${safeJobTitle} role at ${safeCompanyName}.

Your application is currently under review. Our team is evaluating fit and will follow up with the next steps as soon as possible.

Thank you for your patience and interest in our team.

Best regards,
${safeCompanyName}`,
      }
    case 'applied':
    default:
      return {
        subject: `Application received for ${safeJobTitle} at ${safeCompanyName}`,
        body: `Hi ${safeCandidateName},

Thank you for applying to the ${safeJobTitle} role at ${safeCompanyName}.

We have received your application successfully, and our team will review it shortly. If your profile matches what we are looking for, we will contact you with the next step.

We appreciate your interest in joining our team.

Best regards,
${safeCompanyName}`,
      }
  }
}

export function buildWorkspaceInviteEmail({ workspaceName, inviteLink, inviterName }: InviteEmailInput) {
  const safeWorkspaceName = workspaceName.trim() || 'our hiring workspace'
  const safeInviterName = inviterName.trim() || safeWorkspaceName

  return {
    subject: `You are invited to join ${safeWorkspaceName}`,
    body: `Hi,

${safeInviterName} invited you to join the ${safeWorkspaceName} workspace in HireSync AI.

Use the link below to sign in or create your account and join the team:
${inviteLink}

If you were not expecting this invitation, you can ignore this message.

Best regards,
${safeWorkspaceName}`,
  }
}

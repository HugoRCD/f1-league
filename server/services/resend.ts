import { Resend } from 'resend'
import { render } from '@vue-email/render'

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (_resend) return _resend
  const config = useRuntimeConfig()
  const apiKey = config.private?.resendApiKey || config.resendApiKey
  if (!apiKey) return null
  _resend = new Resend(apiKey as string)
  return _resend
}

function getSender(): string {
  const config = useRuntimeConfig()
  return (config.private?.senderEmail || config.senderEmail || 'F1 League <noreply@f1league.app>') as string
}

export async function sendOtpEmail(to: string, otp: string, magicLink?: string) {
  const resend = getResend()
  if (!resend) {
    console.log(`[DEV] OTP for ${to}: ${otp}`)
    if (magicLink) console.log(`[DEV] Magic link: ${magicLink}`)
    return
  }

  const { default: template } = await import('../emails/otpEmail.vue')
  const html = await render(template, { otp, magicLink: magicLink || '' })
  await resend.emails.send({
    from: getSender(),
    to,
    subject: `${otp} — Your F1 League login code`,
    html,
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  const resend = getResend()
  if (!resend) {
    console.log(`[DEV] Welcome email for ${name} (${to})`)
    return
  }

  const { default: template } = await import('../emails/welcomeEmail.vue')
  const html = await render(template, { name })
  await resend.emails.send({
    from: getSender(),
    to,
    subject: 'Welcome to F1 League',
    html,
  })
}

export async function sendReminderEmail(to: string, data: { name: string, raceName: string, raceLocation: string, lockTime: string, appUrl: string }) {
  const resend = getResend()
  if (!resend) {
    console.log(`[DEV] Reminder for ${data.name} (${to}): ${data.raceName}`)
    return
  }

  const { default: template } = await import('../emails/reminderEmail.vue')
  const html = await render(template, data)
  await resend.emails.send({
    from: getSender(),
    to,
    subject: `Predict the ${data.raceName} Top 10!`,
    html,
  })
}

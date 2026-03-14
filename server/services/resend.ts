import { Resend } from 'resend'
import { render } from '@vue-email/render'
import { createRequestLogger } from 'evlog'

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
    const log = createRequestLogger({ email: { type: 'otp', to, devMode: true } })
    log.emit()
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
    const log = createRequestLogger({ email: { type: 'welcome', to, name, devMode: true } })
    log.emit()
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

export async function sendResetPasswordEmail(to: string, name: string, url: string) {
  const resend = getResend()
  if (!resend) {
    const log = createRequestLogger({ email: { type: 'reset-password', to, devMode: true } })
    log.emit()
    return
  }

  const { default: template } = await import('../emails/resetPasswordEmail.vue')
  const html = await render(template, { name, url })
  await resend.emails.send({
    from: getSender(),
    to,
    subject: 'Reset your F1 League password',
    html,
  })
}

export async function sendReminderEmail(to: string, data: { name: string, raceName: string, raceLocation: string, lockTime: string, appUrl: string }) {
  const resend = getResend()
  if (!resend) {
    const log = createRequestLogger({ email: { type: 'reminder', to, raceName: data.raceName, devMode: true } })
    log.emit()
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

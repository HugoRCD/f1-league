import { admin } from 'better-auth/plugins'
import { emailOTP } from 'better-auth/plugins'
import { sql } from 'drizzle-orm'
import { sendOtpEmail, sendWelcomeEmail } from './services/resend'

export default defineServerAuth(() => ({
  appName: 'F1 League',
  emailAndPassword: { enabled: false },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    admin({ defaultRole: 'user' }),
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      async sendVerificationOTP({ email, otp, type }) {
        const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const magicLink = `${baseUrl}/login?email=${encodeURIComponent(email)}&code=${otp}`
        await sendOtpEmail(email, otp, magicLink)
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          const { db } = await import('hub:db')
          const result = await db.execute(sql`SELECT count(*)::int as count FROM "user"`)
          const rows = Array.isArray(result) ? result : result?.rows ?? []
          const count = Number(rows[0]?.count ?? 0)
          if (count === 0) {
            return { data: { ...user, role: 'admin' } }
          }
        },
        async after(user) {
          if (user.email && user.name) {
            await sendWelcomeEmail(user.email, user.name).catch(() => {})
          }
        },
      },
    },
  },
}))

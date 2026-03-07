import { admin } from 'better-auth/plugins'
import { sql } from 'drizzle-orm'

export default defineServerAuth(() => ({
  appName: 'F1 Championship',
  emailAndPassword: { enabled: true },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [admin({ defaultRole: 'user' })],
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
      },
    },
  },
}))

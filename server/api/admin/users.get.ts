import { db, schema } from 'hub:db'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      image: schema.user.image,
      role: schema.user.role,
      createdAt: schema.user.createdAt,
      predictionsCount: sql<number>`(SELECT count(*)::int FROM prediction WHERE prediction."userId" = "user".id)`,
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt)

  log.set({ users: { count: users.length } })
  return users
})

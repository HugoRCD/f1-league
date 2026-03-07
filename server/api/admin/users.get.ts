import { db, schema } from 'hub:db'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
      createdAt: schema.user.createdAt,
      predictionsCount: sql<number>`(SELECT count(*)::int FROM prediction WHERE prediction."userId" = "user".id)`,
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt)

  return users
})

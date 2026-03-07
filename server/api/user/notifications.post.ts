import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event)
  log.set({ user: { id: user.id } })
  const body = await readBody<{ enabled: boolean }>(event)
  log.set({ notifications: { enabled: body.enabled } })

  const [existing] = await db
    .select()
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, user.id))
    .limit(1)

  if (existing) {
    await db
      .update(schema.userPreferences)
      .set({ notificationsEnabled: body.enabled })
      .where(eq(schema.userPreferences.userId, user.id))
  }
  else {
    await db
      .insert(schema.userPreferences)
      .values({ userId: user.id, notificationsEnabled: body.enabled })
  }

  return { notificationsEnabled: body.enabled }
})

import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const body = await readBody<{ name?: string, image?: string }>(event)

  const updates: Record<string, unknown> = {}
  if (body.name) updates.name = body.name
  if (typeof body.image === 'string') updates.image = body.image || null

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Nothing to update' })
  }

  const [updated] = await db
    .update(schema.user)
    .set(updates)
    .where(eq(schema.user.id, user.id))
    .returning({ id: schema.user.id, name: schema.user.name, image: schema.user.image })

  return updated
})

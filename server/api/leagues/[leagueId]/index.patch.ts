import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueAdmin(event, leagueId)

  const body = await readBody<{ name?: string, description?: string, image?: string }>(event)

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (name.length < 2) {
      throw createError({ statusCode: 400, message: 'League name must be at least 2 characters' })
    }
    updates.name = name
  }

  if (body.description !== undefined) {
    updates.description = body.description.trim() || null
  }

  if (body.image !== undefined) {
    updates.image = body.image.trim() || null
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const [updated] = await db
    .update(schema.league)
    .set(updates)
    .where(eq(schema.league.id, leagueId))
    .returning()

  return updated
})

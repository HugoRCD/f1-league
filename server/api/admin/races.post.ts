import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{
    action: 'create' | 'update'
    id?: string
    name?: string
    location?: string
    startAt?: string
    season?: number
  }>(event)

  log.set({ admin: { action: body.action, raceId: body.id } })

  if (body.action === 'create') {
    if (!body.name || !body.location || !body.startAt) {
      throw createError({ statusCode: 400, message: 'name, location, and startAt are required' })
    }
    const [created] = await db
      .insert(schema.race)
      .values({
        name: body.name,
        location: body.location,
        startAt: new Date(body.startAt),
        season: body.season || new Date().getFullYear(),
      })
      .returning()
    log.set({ race: { id: created!.id, name: created!.name } })
    return created
  }

  if (body.action === 'update') {
    if (!body.id) throw createError({ statusCode: 400, message: 'id is required' })
    const updates: Record<string, unknown> = {}
    if (body.name) updates.name = body.name
    if (body.location) updates.location = body.location
    if (body.startAt) updates.startAt = new Date(body.startAt)
    if (body.season) updates.season = body.season

    const [updated] = await db
      .update(schema.race)
      .set(updates)
      .where(eq(schema.race.id, body.id))
      .returning()
    return updated
  }

  throw createError({ statusCode: 400, message: 'Invalid action' })
})

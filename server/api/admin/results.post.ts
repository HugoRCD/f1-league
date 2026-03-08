import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ raceId: string, positions: string[] }>(event)
  log.set({ race: { id: body.raceId } })

  if (!body.raceId) {
    throw createError({ statusCode: 400, message: 'raceId is required' })
  }

  if (!Array.isArray(body.positions) || body.positions.length !== 10) {
    throw createError({ statusCode: 400, message: 'Exactly 10 drivers required' })
  }

  if (new Set(body.positions).size !== 10) {
    throw createError({ statusCode: 400, message: 'No duplicate drivers allowed' })
  }

  const [race] = await db
    .select()
    .from(schema.race)
    .where(eq(schema.race.id, body.raceId))
    .limit(1)

  if (!race) {
    throw createError({ statusCode: 404, message: 'Race not found' })
  }

  const [existing] = await db
    .select()
    .from(schema.raceResult)
    .where(eq(schema.raceResult.raceId, body.raceId))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(schema.raceResult)
      .set({ positions: body.positions })
      .where(eq(schema.raceResult.id, existing.id))
      .returning()
    log.set({ result: { action: 'updated', id: updated!.id } })
    return updated
  }

  const [created] = await db
    .insert(schema.raceResult)
    .values({
      raceId: body.raceId,
      positions: body.positions,
    })
    .returning()
  log.set({ result: { action: 'created', id: created!.id } })
  return created
})

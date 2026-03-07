import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const raceId = getRouterParam(event, 'raceId')!

  const body = await readBody<{ positions: string[] }>(event)

  if (!Array.isArray(body.positions) || body.positions.length !== 10) {
    throw createError({ statusCode: 400, message: 'Exactly 10 drivers required' })
  }

  if (new Set(body.positions).size !== 10) {
    throw createError({ statusCode: 400, message: 'No duplicate drivers allowed' })
  }

  const [race] = await db
    .select()
    .from(schema.race)
    .where(eq(schema.race.id, raceId))
    .limit(1)

  if (!race) {
    throw createError({ statusCode: 404, message: 'Race not found' })
  }

  const config = await getScoringConfig()
  const window = getRaceWindow(race.startAt, config)

  if (window.locked) {
    throw createError({ statusCode: 403, message: 'Predictions are locked for this race' })
  }

  if (!window.open) {
    throw createError({ statusCode: 403, message: 'Predictions are not open yet for this race' })
  }

  const [existing] = await db
    .select()
    .from(schema.prediction)
    .where(and(
      eq(schema.prediction.userId, user.id),
      eq(schema.prediction.raceId, raceId),
    ))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(schema.prediction)
      .set({ positions: body.positions })
      .where(eq(schema.prediction.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(schema.prediction)
    .values({
      userId: user.id,
      raceId,
      positions: body.positions,
    })
    .returning()

  return created
})

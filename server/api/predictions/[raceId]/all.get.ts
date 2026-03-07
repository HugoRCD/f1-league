import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const raceId = getRouterParam(event, 'raceId')!

  const [race] = await db
    .select()
    .from(schema.race)
    .where(eq(schema.race.id, raceId))
    .limit(1)

  if (!race) {
    throw createError({ statusCode: 404, message: 'Race not found' })
  }

  const lockOffset = await getLockOffsetMs()
  if (!isRaceLocked(race.startAt, lockOffset)) {
    throw createError({ statusCode: 403, message: 'Predictions are not yet visible' })
  }

  const predictions = await db
    .select({
      id: schema.prediction.id,
      userId: schema.prediction.userId,
      userName: schema.user.name,
      positions: schema.prediction.positions,
      createdAt: schema.prediction.createdAt,
    })
    .from(schema.prediction)
    .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
    .where(eq(schema.prediction.raceId, raceId))

  return predictions
})

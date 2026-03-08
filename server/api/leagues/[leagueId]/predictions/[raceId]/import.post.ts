import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  const raceId = getRouterParam(event, 'raceId')!
  const { user } = await requireLeagueMember(event, leagueId)

  const body = await readBody<{ fromLeagueId: string }>(event)

  if (!body.fromLeagueId) {
    throw createError({ statusCode: 400, message: 'Source league ID is required' })
  }

  await requireLeagueMember(event, body.fromLeagueId)

  const [sourcePrediction] = await db
    .select()
    .from(schema.prediction)
    .where(and(
      eq(schema.prediction.userId, user.id),
      eq(schema.prediction.raceId, raceId),
      eq(schema.prediction.leagueId, body.fromLeagueId),
    ))
    .limit(1)

  if (!sourcePrediction) {
    throw createError({ statusCode: 404, message: 'No prediction found in the source league for this race' })
  }

  const [race] = await db
    .select()
    .from(schema.race)
    .where(eq(schema.race.id, raceId))
    .limit(1)

  if (!race) {
    throw createError({ statusCode: 404, message: 'Race not found' })
  }

  const config = await getLeagueScoringConfig(leagueId)
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
      eq(schema.prediction.leagueId, leagueId),
    ))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(schema.prediction)
      .set({ positions: sourcePrediction.positions })
      .where(eq(schema.prediction.id, existing.id))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(schema.prediction)
    .values({
      userId: user.id,
      raceId,
      leagueId,
      positions: sourcePrediction.positions,
    })
    .returning()

  return created
})

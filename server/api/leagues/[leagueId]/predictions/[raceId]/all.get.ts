import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  const raceId = getRouterParam(event, 'raceId')!
  await requireLeagueMember(event, leagueId)

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

  if (!window.locked) {
    throw createError({ statusCode: 403, message: 'Predictions are only visible after the race is locked' })
  }

  const memberIds = await db
    .select({ userId: schema.leagueMember.userId })
    .from(schema.leagueMember)
    .where(eq(schema.leagueMember.leagueId, leagueId))

  const userIds = memberIds.map(m => m.userId)
  if (userIds.length === 0) return []

  const predictions = await db
    .select({
      userId: schema.prediction.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
      positions: schema.prediction.positions,
      createdAt: schema.prediction.createdAt,
    })
    .from(schema.prediction)
    .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
    .where(and(
      eq(schema.prediction.raceId, raceId),
      eq(schema.prediction.leagueId, leagueId),
      inArray(schema.prediction.userId, userIds),
    ))

  return predictions
})

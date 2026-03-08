import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  const raceId = getRouterParam(event, 'raceId')!
  await requireLeagueMember(event, leagueId)

  const [result] = await db
    .select()
    .from(schema.raceResult)
    .where(eq(schema.raceResult.raceId, raceId))
    .limit(1)

  if (!result) return { standings: null }

  const memberIds = await db
    .select({ userId: schema.leagueMember.userId })
    .from(schema.leagueMember)
    .where(eq(schema.leagueMember.leagueId, leagueId))

  const userIds = memberIds.map(m => m.userId)
  if (userIds.length === 0) return { standings: [] }

  const [config, predictions] = await Promise.all([
    getLeagueScoringConfig(leagueId),
    db.select({
      userId: schema.prediction.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
      positions: schema.prediction.positions,
    })
      .from(schema.prediction)
      .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
      .where(and(
        eq(schema.prediction.raceId, raceId),
        eq(schema.prediction.leagueId, leagueId),
        inArray(schema.prediction.userId, userIds),
      )),
  ])

  const standings = predictions.map((p) => {
    const score = calculateRaceScore(p.positions as string[], result.positions as string[], config)
    return { userId: p.userId, userName: p.userName, userImage: p.userImage, ...score }
  })

  return { standings: rankRaceStandings(standings) }
})

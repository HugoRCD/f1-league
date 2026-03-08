import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueMember(event, leagueId)

  const league = await getLeagueById(leagueId)
  const season = league.season

  const races = await db
    .select({ id: schema.race.id })
    .from(schema.race)
    .where(eq(schema.race.season, season))

  const raceIds = races.map(r => r.id)
  if (raceIds.length === 0) return []

  const results = await db
    .select()
    .from(schema.raceResult)
    .where(inArray(schema.raceResult.raceId, raceIds))

  if (results.length === 0) return []

  const config = await getLeagueScoringConfig(leagueId)
  const resultRaceIds = results.map(r => r.raceId)

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
      raceId: schema.prediction.raceId,
      positions: schema.prediction.positions,
    })
    .from(schema.prediction)
    .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
    .where(and(
      inArray(schema.prediction.raceId, resultRaceIds),
      eq(schema.prediction.leagueId, leagueId),
      inArray(schema.prediction.userId, userIds),
    ))

  const allRaceStandings = results.map((result) => {
    const racePredictions = predictions.filter(p => p.raceId === result.raceId)
    const standings = racePredictions.map((p) => {
      const score = calculateRaceScore(p.positions as string[], result.positions as string[], config)
      return {
        userId: p.userId,
        userName: p.userName,
        userImage: p.userImage,
        ...score,
      }
    })
    return { raceId: result.raceId, standings }
  })

  const seasonStandings = calculateSeasonStandings(allRaceStandings)
  log.set({ leaderboard: { players: seasonStandings.length, races: results.length, league: leagueId } })
  return seasonStandings
})

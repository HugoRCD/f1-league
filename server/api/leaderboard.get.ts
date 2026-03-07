import { eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const query = getQuery(event)
  const season = Number(query.season) || new Date().getFullYear()

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

  const config = await getScoringConfig()
  const resultRaceIds = results.map(r => r.raceId)

  const predictions = await db
    .select({
      userId: schema.prediction.userId,
      userName: schema.user.name,
      raceId: schema.prediction.raceId,
      positions: schema.prediction.positions,
    })
    .from(schema.prediction)
    .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
    .where(inArray(schema.prediction.raceId, resultRaceIds))

  const allRaceStandings = results.map((result) => {
    const racePredictions = predictions.filter(p => p.raceId === result.raceId)
    const standings = racePredictions.map((p) => {
      const score = calculateRaceScore(p.positions as string[], result.positions as string[], config)
      return {
        userId: p.userId,
        userName: p.userName,
        ...score,
      }
    })
    return { raceId: result.raceId, standings }
  })

  return calculateSeasonStandings(allRaceStandings)
})

import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const season = Number(query.season) || new Date().getFullYear()

  const [config, races, results] = await Promise.all([
    getScoringConfig(),
    db.select({
      id: schema.race.id,
      name: schema.race.name,
      location: schema.race.location,
      startAt: schema.race.startAt,
      season: schema.race.season,
    }).from(schema.race).where(eq(schema.race.season, season)).orderBy(schema.race.startAt),
    db.select({ raceId: schema.raceResult.raceId }).from(schema.raceResult),
  ])

  const resultSet = new Set(results.map(r => r.raceId))

  let userPredictionSet = new Set<string>()
  try {
    const session = await getUserSession(event)
    const user = (session as any)?.user
    if (user?.id) {
      const predictions = await db
        .select({ raceId: schema.prediction.raceId })
        .from(schema.prediction)
        .where(eq(schema.prediction.userId, user.id))
      userPredictionSet = new Set(predictions.map(p => p.raceId))
    }
  } catch { /* not authenticated */ }

  return races.map((race, index) => ({
    ...race,
    round: index + 1,
    ...getRaceWindow(race.startAt, config),
    hasResult: resultSet.has(race.id),
    hasPrediction: userPredictionSet.has(race.id),
  }))
})

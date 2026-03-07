import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const season = Number(query.season) || new Date().getFullYear()

  const config = await getScoringConfig()

  const races = await db
    .select({
      id: schema.race.id,
      name: schema.race.name,
      location: schema.race.location,
      startAt: schema.race.startAt,
      season: schema.race.season,
    })
    .from(schema.race)
    .where(eq(schema.race.season, season))
    .orderBy(schema.race.startAt)

  const results = await db
    .select({ raceId: schema.raceResult.raceId })
    .from(schema.raceResult)

  const resultSet = new Set(results.map(r => r.raceId))

  return races.map((race, index) => ({
    ...race,
    round: index + 1,
    ...getRaceWindow(race.startAt, config),
    hasResult: resultSet.has(race.id),
  }))
})

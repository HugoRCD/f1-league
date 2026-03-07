import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const raceId = getRouterParam(event, 'raceId')!

  const [config, [race], [result]] = await Promise.all([
    getScoringConfig(),
    db.select().from(schema.race).where(eq(schema.race.id, raceId)).limit(1),
    db.select().from(schema.raceResult).where(eq(schema.raceResult.raceId, raceId)).limit(1),
  ])

  if (!race) throw createError({ statusCode: 404, message: 'Race not found' })

  const allRaces = await db
    .select({ id: schema.race.id })
    .from(schema.race)
    .where(eq(schema.race.season, race.season))
    .orderBy(schema.race.startAt)

  return {
    ...race,
    round: allRaces.findIndex(r => r.id === raceId) + 1,
    ...getRaceWindow(race.startAt, config),
    result: result?.positions ?? null,
  }
})

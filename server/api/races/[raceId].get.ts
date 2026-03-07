import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const raceId = getRouterParam(event, 'raceId')!
  log.set({ race: { id: raceId } })

  const config = await getScoringConfig()

  const [race] = await db
    .select()
    .from(schema.race)
    .where(eq(schema.race.id, raceId))
    .limit(1)

  if (!race) {
    throw createError({ statusCode: 404, message: 'Race not found' })
  }

  const [result] = await db
    .select()
    .from(schema.raceResult)
    .where(eq(schema.raceResult.raceId, raceId))
    .limit(1)

  const allRaces = await db
    .select({ id: schema.race.id })
    .from(schema.race)
    .where(eq(schema.race.season, race.season))
    .orderBy(schema.race.startAt)

  const round = allRaces.findIndex(r => r.id === raceId) + 1

  return {
    ...race,
    round,
    ...getRaceWindow(race.startAt, config),
    result: result?.positions ?? null,
  }
})

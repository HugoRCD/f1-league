import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event)
  const raceId = getRouterParam(event, 'raceId')!
  log.set({ race: { id: raceId } })

  const [result] = await db
    .select()
    .from(schema.raceResult)
    .where(eq(schema.raceResult.raceId, raceId))
    .limit(1)

  if (!result) {
    return { standings: null }
  }

  const config = await getScoringConfig()

  const predictions = await db
    .select({
      userId: schema.prediction.userId,
      userName: schema.user.name,
      positions: schema.prediction.positions,
    })
    .from(schema.prediction)
    .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
    .where(eq(schema.prediction.raceId, raceId))

  const standings = predictions.map((p) => {
    const score = calculateRaceScore(p.positions as string[], result.positions as string[], config)
    return {
      userId: p.userId,
      userName: p.userName,
      ...score,
    }
  })

  log.set({ standings: { players: standings.length } })
  return { standings: rankRaceStandings(standings) }
})

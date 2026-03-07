import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  const raceId = getRouterParam(event, 'raceId')!

  const [result] = await db.select().from(schema.raceResult).where(eq(schema.raceResult.raceId, raceId)).limit(1)
  if (!result) return { standings: null }

  const [config, predictions] = await Promise.all([
    getScoringConfig(),
    db.select({
      userId: schema.prediction.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
      positions: schema.prediction.positions,
    })
      .from(schema.prediction)
      .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
      .where(eq(schema.prediction.raceId, raceId)),
  ])

  const standings = predictions.map((p) => {
    const score = calculateRaceScore(p.positions as string[], result.positions as string[], config)
    return { userId: p.userId, userName: p.userName, userImage: p.userImage, ...score }
  })

  return { standings: rankRaceStandings(standings) }
})

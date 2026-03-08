import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  const raceId = getRouterParam(event, 'raceId')!
  const { user } = await requireLeagueMember(event, leagueId)

  const [prediction] = await db
    .select()
    .from(schema.prediction)
    .where(and(
      eq(schema.prediction.userId, user.id),
      eq(schema.prediction.raceId, raceId),
      eq(schema.prediction.leagueId, leagueId),
    ))
    .limit(1)

  return prediction ?? null
})

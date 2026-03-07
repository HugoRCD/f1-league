import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event)
  const raceId = getRouterParam(event, 'raceId')!
  log.set({ user: { id: user.id }, race: { id: raceId } })

  const [prediction] = await db
    .select()
    .from(schema.prediction)
    .where(and(
      eq(schema.prediction.userId, user.id),
      eq(schema.prediction.raceId, raceId),
    ))
    .limit(1)

  return prediction ?? null
})

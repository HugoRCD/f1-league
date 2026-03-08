import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const leagueId = getRouterParam(event, 'leagueId')!
  const { user } = await requireLeagueAdmin(event, leagueId)
  log.set({ user: { id: user.id }, action: 'delete-league', league: { id: leagueId } })

  await db.delete(schema.league).where(eq(schema.league.id, leagueId))

  return { success: true }
})

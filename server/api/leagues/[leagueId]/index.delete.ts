import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueAdmin(event, leagueId)

  await db.delete(schema.league).where(eq(schema.league.id, leagueId))

  return { success: true }
})

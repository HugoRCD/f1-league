import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueAdmin(event, leagueId)

  const newCode = generateInviteCode()

  const [updated] = await db
    .update(schema.league)
    .set({ inviteCode: newCode })
    .where(eq(schema.league.id, leagueId))
    .returning()

  return { inviteCode: updated!.inviteCode }
})

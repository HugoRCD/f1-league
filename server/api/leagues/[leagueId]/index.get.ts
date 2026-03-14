import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  const { membership } = await requireLeagueMember(event, leagueId)

  const [league] = await db
    .select()
    .from(schema.league)
    .where(eq(schema.league.id, leagueId))
    .limit(1)

  if (!league) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }

  const members = await db
    .select()
    .from(schema.leagueMember)
    .where(eq(schema.leagueMember.leagueId, leagueId))

  return {
    ...league,
    inviteCode: league.inviteCode,
    memberCount: members.length,
    currentUserRole: membership.role,
  }
})

import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const leagueId = getRouterParam(event, 'leagueId')!
  const { user, membership } = await requireLeagueMember(event, leagueId)
  log.set({ user: { id: user.id }, action: 'leave-league', league: { id: leagueId } })

  if (membership.role === 'admin') {
    const admins = await db
      .select()
      .from(schema.leagueMember)
      .where(and(
        eq(schema.leagueMember.leagueId, leagueId),
        eq(schema.leagueMember.role, 'admin'),
      ))

    if (admins.length <= 1) {
      throw createError({
        statusCode: 400,
        message: 'You are the only admin. Transfer admin rights or delete the league.',
      })
    }
  }

  await db
    .delete(schema.leagueMember)
    .where(and(
      eq(schema.leagueMember.leagueId, leagueId),
      eq(schema.leagueMember.userId, user.id),
    ))

  return { success: true }
})

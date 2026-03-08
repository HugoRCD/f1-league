import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  const userId = getRouterParam(event, 'userId')!
  const { user } = await requireLeagueAdmin(event, leagueId)

  if (userId === user.id) {
    throw createError({ statusCode: 400, message: 'You cannot remove yourself. Use the leave endpoint instead.' })
  }

  const [member] = await db
    .select()
    .from(schema.leagueMember)
    .where(and(
      eq(schema.leagueMember.leagueId, leagueId),
      eq(schema.leagueMember.userId, userId),
    ))
    .limit(1)

  if (!member) {
    throw createError({ statusCode: 404, message: 'Member not found in this league' })
  }

  await db
    .delete(schema.leagueMember)
    .where(eq(schema.leagueMember.id, member.id))

  return { success: true }
})

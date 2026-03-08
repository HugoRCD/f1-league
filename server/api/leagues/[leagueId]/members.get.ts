import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueMember(event, leagueId)

  const members = await db
    .select({
      id: schema.leagueMember.id,
      userId: schema.leagueMember.userId,
      role: schema.leagueMember.role,
      joinedAt: schema.leagueMember.joinedAt,
      userName: schema.user.name,
      userImage: schema.user.image,
      userEmail: schema.user.email,
    })
    .from(schema.leagueMember)
    .innerJoin(schema.user, eq(schema.leagueMember.userId, schema.user.id))
    .where(eq(schema.leagueMember.leagueId, leagueId))

  return members
})

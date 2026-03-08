import { eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const memberships = await db
    .select({
      leagueId: schema.leagueMember.leagueId,
      role: schema.leagueMember.role,
      joinedAt: schema.leagueMember.joinedAt,
      league: {
        id: schema.league.id,
        name: schema.league.name,
        slug: schema.league.slug,
        description: schema.league.description,
        image: schema.league.image,
        season: schema.league.season,
        createdAt: schema.league.createdAt,
      },
    })
    .from(schema.leagueMember)
    .innerJoin(schema.league, eq(schema.leagueMember.leagueId, schema.league.id))
    .where(eq(schema.leagueMember.userId, user.id))

  if (memberships.length === 0) return []

  const leagueIds = memberships.map(m => m.leagueId)

  const allMembers = await db
    .select({
      leagueId: schema.leagueMember.leagueId,
      userId: schema.leagueMember.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
    })
    .from(schema.leagueMember)
    .innerJoin(schema.user, eq(schema.leagueMember.userId, schema.user.id))
    .where(inArray(schema.leagueMember.leagueId, leagueIds))

  const membersByLeague = new Map<string, { userId: string, name: string, image: string | null }[]>()
  for (const m of allMembers) {
    if (!membersByLeague.has(m.leagueId)) membersByLeague.set(m.leagueId, [])
    membersByLeague.get(m.leagueId)!.push({ userId: m.userId, name: m.userName, image: m.userImage })
  }

  return memberships.map(m => ({
    ...m.league,
    role: m.role,
    joinedAt: m.joinedAt,
    memberCount: membersByLeague.get(m.leagueId)?.length ?? 0,
    members: membersByLeague.get(m.leagueId) ?? [],
  }))
})

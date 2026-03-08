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
    .select({ leagueId: schema.leagueMember.leagueId })
    .from(schema.leagueMember)
    .where(inArray(schema.leagueMember.leagueId, leagueIds))

  const countMap = new Map<string, number>()
  for (const m of allMembers) {
    countMap.set(m.leagueId, (countMap.get(m.leagueId) ?? 0) + 1)
  }

  return memberships.map(m => ({
    ...m.league,
    role: m.role,
    joinedAt: m.joinedAt,
    memberCount: countMap.get(m.leagueId) ?? 0,
  }))
})

import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const leagues = await db
    .select({
      id: schema.league.id,
      name: schema.league.name,
      slug: schema.league.slug,
      season: schema.league.season,
      createdAt: schema.league.createdAt,
      createdBy: schema.league.createdBy,
      creatorName: schema.user.name,
    })
    .from(schema.league)
    .innerJoin(schema.user, eq(schema.league.createdBy, schema.user.id))

  const memberCounts = new Map<string, number>()
  const allMembers = await db
    .select({ leagueId: schema.leagueMember.leagueId })
    .from(schema.leagueMember)

  for (const m of allMembers) {
    memberCounts.set(m.leagueId, (memberCounts.get(m.leagueId) ?? 0) + 1)
  }

  return leagues.map(l => ({
    ...l,
    memberCount: memberCounts.get(l.id) ?? 0,
  }))
})

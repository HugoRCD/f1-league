import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')!

  const [league] = await db
    .select({
      id: schema.league.id,
      name: schema.league.name,
      slug: schema.league.slug,
      description: schema.league.description,
      image: schema.league.image,
      season: schema.league.season,
    })
    .from(schema.league)
    .where(eq(schema.league.inviteCode, code))
    .limit(1)

  if (!league) {
    throw createError({ statusCode: 404, message: 'This invite link is invalid or has expired.' })
  }

  const members = await db
    .select()
    .from(schema.leagueMember)
    .where(eq(schema.leagueMember.leagueId, league.id))

  return {
    ...league,
    memberCount: members.length,
  }
})

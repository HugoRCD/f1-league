import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ inviteCode: string }>(event)

  if (!body.inviteCode?.trim()) {
    throw createError({ statusCode: 400, message: 'Invite code is required' })
  }

  const [league] = await db
    .select()
    .from(schema.league)
    .where(eq(schema.league.inviteCode, body.inviteCode.trim()))
    .limit(1)

  if (!league) {
    throw createError({ statusCode: 404, message: 'Invalid invite code' })
  }

  const [existing] = await db
    .select()
    .from(schema.leagueMember)
    .where(and(
      eq(schema.leagueMember.leagueId, league.id),
      eq(schema.leagueMember.userId, user.id),
    ))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, message: 'You are already a member of this league' })
  }

  await db.insert(schema.leagueMember).values({
    leagueId: league.id,
    userId: user.id,
    role: 'member',
  })

  return { league: { id: league.id, name: league.name, slug: league.slug } }
})

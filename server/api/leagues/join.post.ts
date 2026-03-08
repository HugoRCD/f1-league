import { and, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event)
  const body = await readBody<{ inviteCode: string }>(event)
  log.set({ user: { id: user.id }, action: 'join-league' })

  if (!body.inviteCode?.trim()) {
    throw createError({ statusCode: 400, message: 'Invite code is required.' })
  }

  const code = body.inviteCode.trim()
  log.set({ inviteCode: code })

  const [league] = await db
    .select()
    .from(schema.league)
    .where(eq(schema.league.inviteCode, code))
    .limit(1)

  if (!league) {
    throw createError({ statusCode: 404, message: 'This invite code is invalid or has expired.' })
  }

  log.set({ league: { id: league.id, name: league.name } })

  const [existing] = await db
    .select()
    .from(schema.leagueMember)
    .where(and(
      eq(schema.leagueMember.leagueId, league.id),
      eq(schema.leagueMember.userId, user.id),
    ))
    .limit(1)

  if (existing) {
    log.set({ result: 'already-member' })
    return { league: { id: league.id, name: league.name, slug: league.slug } }
  }

  try {
    await db.insert(schema.leagueMember).values({
      leagueId: league.id,
      userId: user.id,
      role: 'member',
    })
    log.set({ result: 'joined' })
  } catch (e: any) {
    const dbCode = e?.code ?? e?.cause?.code ?? ''
    const detail = e?.detail ?? e?.cause?.detail ?? e?.message ?? ''
    log.error(new Error(`Join league failed: [${dbCode}] ${detail}`))
    log.set({ db: { code: dbCode, detail } })

    if (dbCode === '23503') {
      throw createError({ statusCode: 401, message: 'Your session has expired. Sign out and sign in again.' })
    }
    throw createError({ statusCode: 500, message: 'Failed to join the league. Try again.' })
  }

  return { league: { id: league.id, name: league.name, slug: league.slug } }
})

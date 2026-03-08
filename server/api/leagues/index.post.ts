import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event)
  const body = await readBody<{ name: string, description?: string, image?: string }>(event)
  log.set({ user: { id: user.id }, action: 'create-league' })

  if (!body.name || body.name.trim().length < 2) {
    throw createError({ statusCode: 400, message: 'League name must be at least 2 characters.', why: 'The submitted name is too short', fix: 'Enter a name with at least 2 characters' })
  }

  const name = body.name.trim()
  if (name.length > 50) {
    throw createError({ statusCode: 400, message: 'League name must be 50 characters or less.', why: `Name is ${name.length} characters`, fix: 'Shorten the league name' })
  }

  log.set({ league: { name } })

  const existingByName = await db
    .select({ id: schema.league.id })
    .from(schema.league)
    .where(eq(schema.league.name, name))
    .limit(1)

  if (existingByName.length > 0) {
    throw createError({ statusCode: 409, message: `A league named "${name}" already exists.`, why: 'League name must be unique', fix: 'Choose a different name for your league' })
  }

  let slug = slugify(name)

  const existingBySlug = await db
    .select({ id: schema.league.id })
    .from(schema.league)
    .where(eq(schema.league.slug, slug))
    .limit(1)

  if (existingBySlug.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const inviteCode = generateInviteCode()

  try {
    const [league] = await db
      .insert(schema.league)
      .values({
        name,
        slug,
        description: body.description?.trim() || null,
        image: body.image?.trim() || null,
        inviteCode,
        createdBy: user.id,
      })
      .returning()

    if (!league) {
      log.error(new Error('League insert returned empty result'))
      throw createError({ statusCode: 500, message: 'Failed to create the league.', why: 'Database insert returned no rows', fix: 'Try again or contact support' })
    }

    await db.insert(schema.leagueMember).values({
      leagueId: league.id,
      userId: user.id,
      role: 'admin',
    })

    log.set({ league: { id: league.id, slug: league.slug }, result: 'created' })
    return league
  } catch (e: any) {
    if (e.statusCode) throw e

    const dbCode = e?.code ?? e?.cause?.code ?? ''
    const detail = e?.detail ?? e?.cause?.detail ?? e?.message ?? ''
    log.error(new Error(`League creation failed: [${dbCode}] ${detail}`))
    log.set({ db: { code: dbCode, detail } })

    if (dbCode === '23503') {
      throw createError({ statusCode: 401, message: 'Your session has expired.', why: `User ID ${user.id} does not exist in the database`, fix: 'Sign out and sign in again to refresh your session' })
    }
    if (dbCode === '23505') {
      throw createError({ statusCode: 409, message: 'A league with this name already exists.', why: 'Unique constraint violation on league table', fix: 'Choose a different name for your league' })
    }

    throw createError({ statusCode: 500, message: 'Failed to create the league.', why: `Database error: ${detail}`, fix: 'Try again or contact support' })
  }
})

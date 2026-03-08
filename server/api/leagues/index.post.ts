import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ name: string, description?: string, image?: string }>(event)

  if (!body.name || body.name.trim().length < 2) {
    throw createError({ statusCode: 400, message: 'League name must be at least 2 characters' })
  }

  const name = body.name.trim()
  let slug = slugify(name)

  const existing = await db
    .select({ id: schema.league.id })
    .from(schema.league)
    .where(eq(schema.league.slug, slug))
    .limit(1)

  if (existing.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const inviteCode = generateInviteCode()

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

  if (!league) throw createError({ statusCode: 500, message: 'Failed to create league' })

  await db.insert(schema.leagueMember).values({
    leagueId: league.id,
    userId: user.id,
    role: 'admin',
  })

  return league
})

import { eq, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

interface LeagueImport {
  version: number
  league: { name: string, description?: string }
  members: { name: string, email: string, role: 'admin' | 'member' }[]
  predictions: {
    userEmail: string
    raceName: string
    positions: { lastName: string, number: number }[]
    createdAt?: string
  }[]
}

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event, { user: { role: 'admin' } })
  log.set({ action: 'import-league' })

  const body = await readBody<LeagueImport>(event)

  if (!body.league?.name?.trim()) {
    throw createError({ statusCode: 400, message: 'League name is required' })
  }

  const currentDrivers = await db.select().from(schema.driver).where(eq(schema.driver.active, true))
  const currentRaces = await db.select().from(schema.race)

  function resolveDriverId(driver: { lastName: string, number: number }): string | null {
    const byNumber = currentDrivers.find(d => d.number === driver.number)
    if (byNumber) return byNumber.id
    const byName = currentDrivers.find(d => normalizeDriverName(d.lastName) === normalizeDriverName(driver.lastName))
    if (byName) return byName.id
    return null
  }

  const [existingUser] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, user.id))
    .limit(1)

  if (!existingUser) {
    await db.execute(sql`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES (${user.id}, ${user.name ?? 'Admin'}, ${user.email}, true, NOW(), NOW())`)
  }

  const [leagueRecord] = await db
    .insert(schema.league)
    .values({
      name: body.league.name.trim(),
      slug: `${slugify(body.league.name.trim()) }-${ Date.now().toString(36)}`,
      description: body.league.description?.trim() || null,
      inviteCode: generateInviteCode(),
      createdBy: user.id,
    })
    .returning()

  if (!leagueRecord) {
    throw createError({ statusCode: 500, message: 'Failed to create league' })
  }

  const emailToUserId = new Map<string, string>()
  let usersCreated = 0

  for (const member of body.members) {
    const [existing] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, member.email))
      .limit(1)

    let userId: string
    if (existing) {
      userId = existing.id
    } else if (member.email === 'pitwall@bot') {
      const bot = await getPitwallUser()
      userId = bot!.id
    } else {
      userId = crypto.randomUUID()
      await db.execute(sql`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES (${userId}, ${member.name}, ${member.email}, true, NOW(), NOW())`)
      usersCreated++
    }

    emailToUserId.set(member.email, userId)

    const role = userId === user.id ? 'admin' : member.role
    await db.insert(schema.leagueMember)
      .values({ leagueId: leagueRecord.id, userId, role })
      .onConflictDoNothing()
  }

  if (!emailToUserId.has(user.email)) {
    await db.insert(schema.leagueMember)
      .values({ leagueId: leagueRecord.id, userId: user.id, role: 'admin' })
      .onConflictDoNothing()
  }

  let predictionsImported = 0
  let predictionsSkipped = 0

  for (const pred of body.predictions) {
    const userId = emailToUserId.get(pred.userEmail)
    const race = currentRaces.find(r => r.name === pred.raceName)

    if (!userId || !race) {
      predictionsSkipped++
      continue
    }

    const positions = pred.positions.map(p => resolveDriverId(p))
    if (positions.some(p => p === null) || positions.length !== 10) {
      predictionsSkipped++
      continue
    }

    await db.insert(schema.prediction)
      .values({ userId, raceId: race.id, leagueId: leagueRecord.id, positions: positions as string[] })
      .onConflictDoNothing()
    predictionsImported++
  }

  const result = {
    leagueId: leagueRecord.id,
    leagueSlug: leagueRecord.slug,
    leagueName: leagueRecord.name,
    usersCreated,
    memberCount: emailToUserId.size,
    predictionsImported,
    predictionsSkipped,
  }
  log.set({ import: result })
  return result
})

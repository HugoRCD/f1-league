import { eq, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ racesToSimulate?: number, leagueId?: string }>(event)
  const racesToSimulate = body.racesToSimulate ?? 5
  log.set({ action: 'simulate', racesToSimulate, targetLeagueId: body.leagueId })

  const allDrivers = await db.select().from(schema.driver).where(eq(schema.driver.active, true))
  if (allDrivers.length < 10) {
    throw createError({ statusCode: 400, message: 'Need at least 10 active drivers' })
  }

  const driverIds = allDrivers.map(d => d.id)

  const fakeUsers = [
    { name: 'Alice Hamilton', email: 'alice@test.com' },
    { name: 'Bob Leclerc', email: 'bob@test.com' },
    { name: 'Charlie Norris', email: 'charlie@test.com' },
    { name: 'Diana Verstappen', email: 'diana@test.com' },
    { name: 'Eve Piastri', email: 'eve@test.com' },
  ]

  const userIds: string[] = []
  for (const fakeUser of fakeUsers) {
    const [existing] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, fakeUser.email))
      .limit(1)

    if (existing) {
      userIds.push(existing.id)
    } else {
      const id = crypto.randomUUID()
      await db.execute(sql`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES (${id}, ${fakeUser.name}, ${fakeUser.email}, true, NOW(), NOW())`)
      userIds.push(id)
    }
  }

  if (userIds.length === 0) {
    throw createError({ statusCode: 500, message: 'Failed to create test users' })
  }

  let targetLeagueId: string
  let targetLeagueSlug: string

  if (body.leagueId) {
    const [league] = await db.select().from(schema.league).where(eq(schema.league.id, body.leagueId)).limit(1)
    if (!league) throw createError({ statusCode: 404, message: 'League not found' })
    targetLeagueId = league.id
    targetLeagueSlug = league.slug
  } else {
    const [existing] = await db.select().from(schema.league).where(eq(schema.league.slug, 'simulation')).limit(1)
    if (existing) {
      targetLeagueId = existing.id
      targetLeagueSlug = existing.slug
    } else {
      const [created] = await db
        .insert(schema.league)
        .values({
          name: 'Simulation League',
          slug: 'simulation',
          description: 'Auto-generated league for simulation testing',
          inviteCode: generateInviteCode(),
          createdBy: user.id,
        })
        .returning()
      targetLeagueId = created!.id
      targetLeagueSlug = created!.slug
    }
  }

  for (const userId of userIds) {
    await db
      .insert(schema.leagueMember)
      .values({ leagueId: targetLeagueId, userId, role: 'member' })
      .onConflictDoNothing()
  }

  const currentUser = await db.select({ id: schema.leagueMember.id }).from(schema.leagueMember)
    .where(sql`${schema.leagueMember.leagueId} = ${targetLeagueId} AND ${schema.leagueMember.userId} = ${user.id}`)
    .limit(1)
  if (!currentUser.length) {
    await db.insert(schema.leagueMember).values({ leagueId: targetLeagueId, userId: user.id, role: 'admin' }).onConflictDoNothing()
  }

  const races = await db
    .select()
    .from(schema.race)
    .orderBy(schema.race.startAt)
    .limit(racesToSimulate)

  function shuffle(arr: string[]): string[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = a[i]!
      a[i] = a[j]!
      a[j] = temp
    }
    return a
  }

  function randomTop10(): string[] {
    return shuffle(driverIds).slice(0, 10)
  }

  let resultsCreated = 0
  let predictionsCreated = 0

  for (const race of races) {
    const officialResult = randomTop10()
    await db
      .insert(schema.raceResult)
      .values({ raceId: race.id, positions: officialResult })
      .onConflictDoUpdate({
        target: schema.raceResult.raceId,
        set: { positions: officialResult },
      })
    resultsCreated++

    for (const userId of userIds) {
      const prediction = randomTop10()
      await db
        .insert(schema.prediction)
        .values({ userId, raceId: race.id, leagueId: targetLeagueId, positions: prediction })
        .onConflictDoUpdate({
          target: [schema.prediction.userId, schema.prediction.raceId, schema.prediction.leagueId],
          set: { positions: prediction },
        })
      predictionsCreated++
    }
  }

  const result = {
    users: userIds.length,
    races: resultsCreated,
    predictions: predictionsCreated,
    leagueId: targetLeagueId,
    leagueSlug: targetLeagueSlug,
  }
  log.set({ simulate: { result } })
  return result
})

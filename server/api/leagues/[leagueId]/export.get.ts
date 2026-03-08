import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueAdmin(event, leagueId)

  const league = await getLeagueById(leagueId)

  const members = await db
    .select({
      role: schema.leagueMember.role,
      userName: schema.user.name,
      userEmail: schema.user.email,
      userImage: schema.user.image,
    })
    .from(schema.leagueMember)
    .innerJoin(schema.user, eq(schema.leagueMember.userId, schema.user.id))
    .where(eq(schema.leagueMember.leagueId, leagueId))

  const memberUserIds = await db
    .select({ userId: schema.leagueMember.userId })
    .from(schema.leagueMember)
    .where(eq(schema.leagueMember.leagueId, leagueId))

  const userIds = memberUserIds.map(m => m.userId)

  const predictions = userIds.length > 0
    ? await db
      .select({
        userEmail: schema.user.email,
        raceName: schema.race.name,
        positions: schema.prediction.positions,
        createdAt: schema.prediction.createdAt,
      })
      .from(schema.prediction)
      .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
      .innerJoin(schema.race, eq(schema.prediction.raceId, schema.race.id))
      .where(and(
        eq(schema.prediction.leagueId, leagueId),
        inArray(schema.prediction.userId, userIds),
      ))
    : []

  const drivers = await db.select().from(schema.driver).where(eq(schema.driver.active, true))
  const driverMap = new Map(drivers.map(d => [d.id, d]))

  const exportData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    league: {
      name: league.name,
      description: league.description,
    },
    members: members.map(m => ({
      name: m.userName,
      email: m.userEmail,
      image: m.userImage,
      role: m.role as 'admin' | 'member',
    })),
    predictions: predictions.map(p => ({
      userEmail: p.userEmail,
      raceName: p.raceName,
      positions: (p.positions as string[]).map((driverId) => {
        const d = driverMap.get(driverId)
        return { lastName: d?.lastName ?? 'Unknown', number: d?.number ?? 0 }
      }),
      createdAt: p.createdAt.toISOString(),
    })),
  }

  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${slugify(league.name)}-export.json"`)
  return exportData
})

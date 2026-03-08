import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const season = Number(getQuery(event).season) || new Date().getFullYear()

  const [users, races, predictions, results, drivers, teams] = await Promise.all([
    db.select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
    }).from(schema.user),
    db.select().from(schema.race).where(eq(schema.race.season, season)).orderBy(schema.race.startAt),
    db.select().from(schema.prediction),
    db.select().from(schema.raceResult),
    db.select().from(schema.driver),
    db.select().from(schema.team),
  ])

  const raceIds = new Set(races.map(r => r.id))

  const driverMap = new Map(drivers.map(d => [d.id, { firstName: d.firstName, lastName: d.lastName, number: d.number }]))
  const raceMap = new Map(races.map(r => [r.id, r.name]))

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    season,
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    })),
    races: races.map(r => ({
      id: r.id,
      name: r.name,
      location: r.location,
      startAt: r.startAt.toISOString(),
    })),
    predictions: predictions
      .filter(p => raceIds.has(p.raceId))
      .map(p => ({
        userId: p.userId,
        raceId: p.raceId,
        raceName: raceMap.get(p.raceId) ?? null,
        positions: (p.positions as string[]).map(driverId => ({
          driverId,
          ...driverMap.get(driverId),
        })),
        createdAt: p.createdAt.toISOString(),
      })),
    results: results
      .filter(r => raceIds.has(r.raceId))
      .map(r => ({
        raceId: r.raceId,
        raceName: raceMap.get(r.raceId) ?? null,
        positions: (r.positions as string[]).map(driverId => ({
          driverId,
          ...driverMap.get(driverId),
        })),
      })),
    drivers: drivers.map(d => ({
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      number: d.number,
      teamId: d.teamId,
      teamName: teams.find(t => t.id === d.teamId)?.name ?? null,
    })),
  }

  setResponseHeader(event, 'Content-Disposition', `attachment; filename="f1-league-${season}.json"`)
  return exportData
})

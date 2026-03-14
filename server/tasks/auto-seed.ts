import { sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { createRequestLogger } from 'evlog'
import { SEASON, seedTeams, seedDrivers, seedRaces } from '../utils/seed'

export default defineTask({
  meta: {
    name: 'auto-seed',
    description: 'Seed teams, drivers, and races if the database is empty',
  },
  async run() {
    const log = createRequestLogger()
    log.set({ task: 'auto-seed' })

    const [existing] = await db.select({ count: sql<number>`count(*)` }).from(schema.team)
    if (existing && existing.count > 0) {
      log.set({ result: 'skipped', reason: 'teams already exist' })
      log.emit()
      return { result: 'Database already seeded' }
    }

    const upsertedTeams = await db
      .insert(schema.team)
      .values(seedTeams)
      .onConflictDoUpdate({
        target: schema.team.name,
        set: { color: sql`excluded.color` },
      })
      .returning()

    const teamMap = new Map(upsertedTeams.map(t => [t.name, t.id]))

    const driverValues = seedDrivers.map(d => ({
      firstName: d.firstName,
      lastName: d.lastName,
      number: d.number,
      teamId: teamMap.get(d.team)!,
      active: true,
    }))

    await db
      .insert(schema.driver)
      .values(driverValues)
      .onConflictDoUpdate({
        target: schema.driver.number,
        set: {
          firstName: sql`excluded."firstName"`,
          lastName: sql`excluded."lastName"`,
          teamId: sql`excluded."teamId"`,
          active: sql`excluded.active`,
        },
      })

    const raceValues = seedRaces.map(r => ({
      name: r.name,
      location: r.location,
      startAt: new Date(r.startAt),
      season: SEASON,
    }))

    await db
      .insert(schema.race)
      .values(raceValues)
      .onConflictDoUpdate({
        target: [schema.race.name, schema.race.season],
        set: {
          location: sql`excluded.location`,
          startAt: sql`excluded."startAt"`,
        },
      })

    const result = { teams: upsertedTeams.length, drivers: driverValues.length, races: raceValues.length }
    log.set({ seed: result })
    log.emit()
    return { result: `Seeded ${result.teams} teams, ${result.drivers} drivers, ${result.races} races` }
  },
})

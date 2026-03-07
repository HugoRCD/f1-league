import { sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { SEASON, seedTeams, seedDrivers, seedRaces } from '../../utils/seed'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

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

  const upsertedDrivers = await db
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
    .returning()

  const raceValues = seedRaces.map(r => ({
    name: r.name,
    location: r.location,
    startAt: new Date(r.startAt),
    season: SEASON,
  }))

  const upsertedRaces = await db
    .insert(schema.race)
    .values(raceValues)
    .onConflictDoUpdate({
      target: [schema.race.name, schema.race.season],
      set: {
        location: sql`excluded.location`,
        startAt: sql`excluded."startAt"`,
      },
    })
    .returning()

  return {
    teams: upsertedTeams.length,
    drivers: upsertedDrivers.length,
    races: upsertedRaces.length,
  }
})

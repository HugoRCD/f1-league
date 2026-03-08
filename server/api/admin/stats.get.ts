import { sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const countQuery = (table: any) => db.select({ count: sql<number>`count(*)::int` }).from(table).then(r => r[0]!.count)

  const [teams, drivers, races, results, predictions, leagues] = await Promise.all([
    countQuery(schema.team),
    countQuery(schema.driver),
    countQuery(schema.race),
    countQuery(schema.raceResult),
    countQuery(schema.prediction),
    countQuery(schema.league),
  ])

  return { teams, drivers, races, results, predictions, leagues }
})

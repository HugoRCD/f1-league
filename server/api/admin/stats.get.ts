import { sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const [teams] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.team)
  const [drivers] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.driver)
  const [races] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.race)
  const [results] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.raceResult)
  const [predictions] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.prediction)

  const stats = {
    teams: teams.count,
    drivers: drivers.count,
    races: races.count,
    results: results.count,
    predictions: predictions.count,
  }
  log.set({ stats })
  return stats
})

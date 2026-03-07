import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-z]/g, '')
}

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ round: number }>(event)
  if (!body.round) throw createError({ statusCode: 400, message: 'round is required' })

  const raceResults = await $fetch<any[]>(`/api/f1/race/${body.round}`, { baseURL: getRequestURL(event).origin })
  if (!raceResults?.length) {
    throw createError({ statusCode: 404, message: 'No race results available from F1 API for this round' })
  }

  const allDrivers = await db.select().from(schema.driver).where(eq(schema.driver.active, true))

  const top10 = raceResults.slice(0, 10)
  const mapped: { apiName: string, driverId: string | null, position: number }[] = []

  for (const entry of top10) {
    const apiSurname = normalize(entry.driverName.split(' ').pop() ?? '')
    const match = allDrivers.find(d => normalize(d.lastName) === apiSurname)
    mapped.push({
      apiName: entry.driverName,
      driverId: match?.id ?? null,
      position: entry.position,
    })
  }

  return {
    results: mapped,
    positions: mapped.map(m => m.driverId),
    unmatchedCount: mapped.filter(m => !m.driverId).length,
  }
})

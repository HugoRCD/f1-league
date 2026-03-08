import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ round: number }>(event)
  if (!body.round) throw createError({ statusCode: 400, message: 'round is required' })
  log.set({ import: { round: body.round } })

  const raceResults = await $fetch<any[]>(`/api/f1/race/${body.round}`, { baseURL: getRequestURL(event).origin })
  if (!raceResults?.length) {
    throw createError({ statusCode: 404, message: 'No race results available from F1 API for this round', why: `Round ${body.round} returned no results from the F1 API`, fix: 'Check that the round number is correct and the race has been completed' })
  }

  const allDrivers = await db.select().from(schema.driver).where(eq(schema.driver.active, true))

  const top10 = raceResults.slice(0, 10)
  const mapped: { apiName: string, driverId: string | null, position: number }[] = []

  for (const entry of top10) {
    const apiSurname = normalizeDriverName(entry.driverName.split(' ').pop() ?? '')
    const match = allDrivers.find(d => normalizeDriverName(d.lastName) === apiSurname)
    mapped.push({
      apiName: entry.driverName,
      driverId: match?.id ?? null,
      position: entry.position,
    })
  }

  const unmatchedCount = mapped.filter(m => !m.driverId).length
  log.set({ import: { mapped: mapped.length, unmatchedCount } })
  return {
    results: mapped,
    positions: mapped.map(m => m.driverId),
    unmatchedCount,
  }
})

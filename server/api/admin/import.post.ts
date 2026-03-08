import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'

interface ExportedPrediction {
  userId: string
  raceId: string
  raceName: string | null
  positions: { driverId: string, firstName?: string, lastName?: string, number?: number }[]
  createdAt: string
}

interface ExportedResult {
  raceId: string
  raceName: string | null
  positions: { driverId: string, firstName?: string, lastName?: string, number?: number }[]
}

interface ExportData {
  version: number
  season: number
  users: { id: string, name: string, email: string, role: string }[]
  races: { id: string, name: string, location: string, startAt: string }[]
  predictions: ExportedPrediction[]
  results: ExportedResult[]
  drivers: { id: string, firstName: string, lastName: string, number: number, teamId: string }[]
}

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const data = await readBody<ExportData>(event)

  if (!data?.version || !data.season) {
    throw createError({ statusCode: 400, message: 'Invalid export file format' })
  }

  const [currentUsers, currentRaces, currentDrivers] = await Promise.all([
    db.select().from(schema.user),
    db.select().from(schema.race).where(eq(schema.race.season, data.season)),
    db.select().from(schema.driver).where(eq(schema.driver.active, true)),
  ])

  const userByEmail = new Map(currentUsers.map(u => [u.email, u]))
  const raceByName = new Map(currentRaces.map(r => [r.name, r]))
  const driverByKey = new Map(currentDrivers.map(d => [`${normalizeDriverName(d.lastName)}_${d.number}`, d]))

  function resolveDriverId(exported: { driverId: string, lastName?: string, number?: number }): string | null {
    const current = currentDrivers.find(d => d.id === exported.driverId)
    if (current) return current.id

    if (exported.lastName && exported.number) {
      const key = `${normalizeDriverName(exported.lastName)}_${exported.number}`
      return driverByKey.get(key)?.id ?? null
    }

    return null
  }

  let predictionsImported = 0
  let predictionsSkipped = 0
  let resultsImported = 0
  let resultsSkipped = 0

  for (const pred of data.predictions) {
    const user = userByEmail.get(data.users.find(u => u.id === pred.userId)?.email ?? '')
    const race = raceByName.get(pred.raceName ?? '') ?? currentRaces.find(r => r.id === pred.raceId)

    if (!user || !race) {
      predictionsSkipped++
      continue
    }

    const positions = pred.positions.map(p => resolveDriverId(p))
    if (positions.some(p => p === null) || positions.length !== 10) {
      predictionsSkipped++
      continue
    }

    predictionsSkipped++
  }

  for (const res of data.results) {
    const race = raceByName.get(res.raceName ?? '') ?? currentRaces.find(r => r.id === res.raceId)

    if (!race) {
      resultsSkipped++
      continue
    }

    const positions = res.positions.map(p => resolveDriverId(p))
    if (positions.some(p => p === null) || positions.length !== 10) {
      resultsSkipped++
      continue
    }

    const [existing] = await db.select().from(schema.raceResult)
      .where(eq(schema.raceResult.raceId, race.id))
      .limit(1)

    if (existing) {
      await db.update(schema.raceResult)
        .set({ positions: positions as string[] })
        .where(eq(schema.raceResult.id, existing.id))
    } else {
      await db.insert(schema.raceResult).values({
        raceId: race.id,
        positions: positions as string[],
      })
    }
    resultsImported++
  }

  const result = { predictionsImported, predictionsSkipped, resultsImported, resultsSkipped }
  log.set({ import: result })
  return result
})

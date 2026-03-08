import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { createRequestLogger } from 'evlog'

const JOLPICA_API = 'https://api.jolpi.ca/ergast/f1'
const RACE_BUFFER_MS = 3 * 60 * 60 * 1000

export default defineTask({
  meta: {
    name: 'import-results',
    description: 'Auto-import race results from F1 API for completed races',
  },
  async run() {
    const log = createRequestLogger()
    log.set({ task: 'import-results' })
    const season = new Date().getFullYear()
    const now = Date.now()

    const [races, existingResults, allDrivers] = await Promise.all([
      db.select().from(schema.race).where(eq(schema.race.season, season)).orderBy(schema.race.startAt),
      db.select({ raceId: schema.raceResult.raceId }).from(schema.raceResult),
      db.select().from(schema.driver).where(eq(schema.driver.active, true)),
    ])

    const resultSet = new Set(existingResults.map(r => r.raceId))

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (let i = 0; i < races.length; i++) {
      const race = races[i]!

      if (resultSet.has(race.id)) continue
      if (race.startAt.getTime() + RACE_BUFFER_MS > now) continue

      const round = i + 1

      let apiResults: any[] = []
      try {
        const data = await $fetch<any>(`${JOLPICA_API}/${season}/${round}/results/`)
        const races = data.MRData?.RaceTable?.Races ?? []
        apiResults = races.length ? (races[0].Results ?? []) : []
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.status === 404) {
          skipped++
          continue
        }
        errors.push(race.name)
        log.error(e instanceof Error ? e : new Error(`Failed to fetch results for ${race.name}`))
        continue
      }

      if (!apiResults.length) {
        skipped++
        continue
      }

      const top10 = apiResults.slice(0, 10)
      const positions: (string | null)[] = []
      let unmatchedCount = 0

      for (const entry of top10) {
        const familyName = entry.Driver?.familyName ?? ''
        const apiSurname = normalizeDriverName(familyName)
        const match = allDrivers.find(d => normalizeDriverName(d.lastName) === apiSurname)

        if (match) {
          positions.push(match.id)
        } else {
          positions.push(null)
          unmatchedCount++
        }
      }

      if (unmatchedCount > 0) {
        log.warn(`Skipping ${race.name}: ${unmatchedCount} unmatched driver(s)`)
        skipped++
        continue
      }

      const validPositions = positions as string[]

      try {
        const [existing] = await db.select().from(schema.raceResult)
          .where(eq(schema.raceResult.raceId, race.id))
          .limit(1)

        if (existing) {
          await db.update(schema.raceResult)
            .set({ positions: validPositions })
            .where(eq(schema.raceResult.id, existing.id))
        } else {
          await db.insert(schema.raceResult).values({
            raceId: race.id,
            positions: validPositions,
          })
        }

        imported++
      } catch (e) {
        errors.push(race.name)
        log.error(e instanceof Error ? e : new Error(`Failed to save results for ${race.name}`))
      }
    }

    const result = { imported, skipped, errors: errors.length > 0 ? errors : undefined }
    log.set({ importResults: result })
    log.emit()
    return { result }
  },
})

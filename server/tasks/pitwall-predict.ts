import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { createRequestLogger } from 'evlog'
import { generatePitwallPrediction } from '../services/pitwall'
import { getPitwallUser } from '../utils/pitwall'

export default defineTask({
  meta: {
    name: 'pitwall-predict',
    description: 'Pitwall AI makes predictions for open races in all leagues',
  },
  async run() {
    const log = createRequestLogger()
    log.set({ task: 'pitwall-predict' })

    const config = await getScoringConfig()
    const season = new Date().getFullYear()

    const botUser = await getPitwallUser()
    if (!botUser) {
      log.set({ result: 'Pitwall user not available' })
      log.emit()
      return { result: 'Pitwall user not available' }
    }

    const races = await db.select().from(schema.race).where(eq(schema.race.season, season)).orderBy(schema.race.startAt)
    const allDrivers = await db.select().from(schema.driver).where(eq(schema.driver.active, true))
    if (allDrivers.length < 10) {
      log.set({ result: 'Not enough drivers', drivers: { count: allDrivers.length } })
      log.emit()
      return { result: 'Not enough drivers' }
    }

    const pitwallMemberships = await db
      .select({ leagueId: schema.leagueMember.leagueId })
      .from(schema.leagueMember)
      .where(eq(schema.leagueMember.userId, botUser.id))

    if (pitwallMemberships.length === 0) {
      log.set({ result: 'Pitwall is not a member of any league' })
      log.emit()
      return { result: 'Pitwall is not a member of any league' }
    }

    let predicted = 0
    const errors: string[] = []

    for (let i = 0; i < races.length; i++) {
      const race = races[i]!
      const window = getRaceWindow(race.startAt, config)

      if (!window.open || window.locked) continue

      let racePositions: string[] | null = null

      for (const { leagueId } of pitwallMemberships) {
        const [existing] = await db.select().from(schema.prediction)
          .where(and(
            eq(schema.prediction.userId, botUser.id),
            eq(schema.prediction.raceId, race.id),
            eq(schema.prediction.leagueId, leagueId),
          ))
          .limit(1)

        if (existing) continue

        if (!racePositions) {
          try {
            const result = await generatePitwallPrediction({
              raceName: race.name,
              raceLocation: race.location,
              raceRound: i + 1,
              availableDriverIds: allDrivers.map(d => ({ id: d.id, lastName: d.lastName })),
            })
            racePositions = result.prediction
          }
          catch (e) {
            errors.push(race.name)
            log.error(e instanceof Error ? e : new Error(`Pitwall failed to predict ${race.name}`))
            break
          }
        }

        await db.insert(schema.prediction).values({
          userId: botUser.id,
          raceId: race.id,
          leagueId,
          positions: racePositions,
        })
        predicted++
      }
    }

    log.set({ pitwall: { predicted, errors: errors.length > 0 ? errors : undefined } })
    log.emit()
    return { result: `Pitwall predicted ${predicted} race(s) across ${pitwallMemberships.length} league(s)` }
  },
})

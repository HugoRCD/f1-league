import { eq, and } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { generatePitwallPrediction } from '../../services/pitwall'
import { getPitwallUser } from '../../utils/pitwall'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ raceId: string }>(event)
  if (!body.raceId) throw createError({ statusCode: 400, message: 'raceId is required' })
  log.set({ pitwall: { raceId: body.raceId } })

  const [race] = await db.select().from(schema.race).where(eq(schema.race.id, body.raceId)).limit(1)
  if (!race) throw createError({ statusCode: 404, message: 'Race not found' })
  log.set({ pitwall: { raceName: race.name, raceLocation: race.location } })

  const botUser = await getPitwallUser()
  if (!botUser) throw createError({ statusCode: 500, message: 'Failed to create Pitwall user', why: 'Could not find or create the Pitwall bot user in the database' })

  const allDrivers = await db.select().from(schema.driver).where(eq(schema.driver.active, true))

  const allRaces = await db.select({ id: schema.race.id }).from(schema.race).where(eq(schema.race.season, race.season)).orderBy(schema.race.startAt)
  const round = allRaces.findIndex(r => r.id === race.id) + 1

  const { prediction, reasoning } = await generatePitwallPrediction({
    raceName: race.name,
    raceLocation: race.location,
    raceRound: round,
    availableDriverIds: allDrivers.map(d => ({ id: d.id, lastName: d.lastName })),
  })

  const [existing] = await db.select().from(schema.prediction)
    .where(and(eq(schema.prediction.userId, botUser.id), eq(schema.prediction.raceId, race.id)))
    .limit(1)

  if (existing) {
    await db.update(schema.prediction).set({ positions: prediction }).where(eq(schema.prediction.id, existing.id))
  } else {
    await db.insert(schema.prediction).values({ userId: botUser.id, raceId: race.id, positions: prediction })
  }

  const driverNames = prediction.map((id: string) => allDrivers.find(d => d.id === id)?.lastName || id)
  log.set({ pitwall: { action: existing ? 'updated' : 'created', driverNames } })
  return { botName: 'Pitwall', reasoning, driverNames }
})

import { eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

const FAKE_EMAILS = ['alice@test.com', 'bob@test.com', 'charlie@test.com', 'diana@test.com', 'eve@test.com']

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ target: 'simulation' | 'all' }>(event)
  log.set({ admin: { action: 'reset', target: body.target } })

  if (body.target === 'simulation') {
    const fakeUsers = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(inArray(schema.user.email, FAKE_EMAILS))

    const fakeUserIds = fakeUsers.map(u => u.id)

    if (fakeUserIds.length > 0) {
      await db.delete(schema.prediction).where(inArray(schema.prediction.userId, fakeUserIds))
      for (const id of fakeUserIds) {
        await db.delete(schema.session).where(eq(schema.session.userId, id))
        await db.delete(schema.account).where(eq(schema.account.userId, id))
      }
      await db.delete(schema.user).where(inArray(schema.user.id, fakeUserIds))
    }

    await db.delete(schema.raceResult)

    log.set({ reset: { deletedUsers: fakeUserIds.length, clearedResults: true } })
    return { deletedUsers: fakeUserIds.length, clearedResults: true }
  }

  if (body.target === 'all') {
    await db.delete(schema.prediction)
    await db.delete(schema.raceResult)

    return { clearedPredictions: true, clearedResults: true }
  }

  throw createError({ statusCode: 400, message: 'target must be "simulation" or "all"' })
})

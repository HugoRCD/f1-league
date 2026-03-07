import { sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ target: 'simulation' | 'all' }>(event)

  if (body.target === 'simulation') {
    const fakeEmails = ['alice@test.com', 'bob@test.com', 'charlie@test.com', 'diana@test.com', 'eve@test.com']

    const fakeUsers = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(sql`${schema.user.email} = ANY(${fakeEmails})`)

    const fakeUserIds = fakeUsers.map(u => u.id)

    if (fakeUserIds.length > 0) {
      await db.delete(schema.prediction).where(sql`${schema.prediction.userId} = ANY(${fakeUserIds})`)
      for (const id of fakeUserIds) {
        await db.delete(schema.session).where(sql`${schema.session.userId} = ${id}`)
        await db.delete(schema.account).where(sql`${schema.account.userId} = ${id}`)
      }
      await db.delete(schema.user).where(sql`${schema.user.id} = ANY(${fakeUserIds})`)
    }

    await db.delete(schema.raceResult)

    return { deletedUsers: fakeUserIds.length, clearedResults: true }
  }

  if (body.target === 'all') {
    await db.delete(schema.prediction)
    await db.delete(schema.raceResult)

    return { clearedPredictions: true, clearedResults: true }
  }

  throw createError({ statusCode: 400, message: 'target must be "simulation" or "all"' })
})

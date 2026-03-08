import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{ leagueId: string, pitwallEnabled?: boolean }>(event)
  log.set({ action: 'update-league-admin', leagueId: body.leagueId })

  if (!body.leagueId) {
    throw createError({ statusCode: 400, message: 'leagueId is required' })
  }

  const [league] = await db.select().from(schema.league).where(eq(schema.league.id, body.leagueId)).limit(1)
  if (!league) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.pitwallEnabled === 'boolean') {
    updates.pitwallEnabled = body.pitwallEnabled
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'Nothing to update' })
  }

  const [updated] = await db
    .update(schema.league)
    .set(updates)
    .where(eq(schema.league.id, body.leagueId))
    .returning()

  log.set({ result: { pitwallEnabled: updated!.pitwallEnabled } })
  return updated
})

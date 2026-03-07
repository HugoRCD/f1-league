import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{
    action: 'create' | 'update' | 'toggle'
    id?: string
    firstName?: string
    lastName?: string
    number?: number
    teamId?: string
    active?: boolean
  }>(event)

  log.set({ admin: { action: body.action, driverId: body.id } })

  if (body.action === 'create') {
    if (!body.firstName || !body.lastName || !body.number || !body.teamId) {
      throw createError({ statusCode: 400, message: 'firstName, lastName, number, and teamId are required' })
    }
    const [created] = await db
      .insert(schema.driver)
      .values({
        firstName: body.firstName,
        lastName: body.lastName,
        number: body.number,
        teamId: body.teamId,
      })
      .returning()
    return created
  }

  if (body.action === 'update') {
    if (!body.id) throw createError({ statusCode: 400, message: 'id is required' })
    const updates: Record<string, unknown> = {}
    if (body.firstName) updates.firstName = body.firstName
    if (body.lastName) updates.lastName = body.lastName
    if (body.number) updates.number = body.number
    if (body.teamId) updates.teamId = body.teamId

    const [updated] = await db
      .update(schema.driver)
      .set(updates)
      .where(eq(schema.driver.id, body.id))
      .returning()
    return updated
  }

  if (body.action === 'toggle') {
    if (!body.id) throw createError({ statusCode: 400, message: 'id is required' })
    const [driver] = await db
      .select()
      .from(schema.driver)
      .where(eq(schema.driver.id, body.id))
      .limit(1)

    if (!driver) throw createError({ statusCode: 404, message: 'Driver not found' })

    const [updated] = await db
      .update(schema.driver)
      .set({ active: !driver.active })
      .where(eq(schema.driver.id, body.id))
      .returning()
    return updated
  }

  throw createError({ statusCode: 400, message: 'Invalid action' })
})

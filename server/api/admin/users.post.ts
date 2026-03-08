import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user: currentUser } = await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<{
    action: 'update' | 'delete' | 'setRole'
    userId: string
    name?: string
    email?: string
    image?: string | null
    role?: string
  }>(event)

  if (!body.userId) {
    throw createError({ statusCode: 400, message: 'userId is required' })
  }

  log.set({ admin: { action: body.action, targetUserId: body.userId } })

  if (body.action === 'update') {
    const updates: Record<string, unknown> = {}
    if (body.name) updates.name = body.name
    if (body.email) updates.email = body.email
    if (typeof body.image === 'string') updates.image = body.image || null

    if (Object.keys(updates).length === 0) {
      throw createError({ statusCode: 400, message: 'Nothing to update' })
    }

    const [updated] = await db
      .update(schema.user)
      .set(updates)
      .where(eq(schema.user.id, body.userId))
      .returning({ id: schema.user.id, name: schema.user.name, email: schema.user.email })

    if (!updated) throw createError({ statusCode: 404, message: 'User not found' })
    return updated
  }

  if (body.action === 'setRole') {
    if (!body.role || !['admin', 'user'].includes(body.role)) {
      throw createError({ statusCode: 400, message: 'role must be "admin" or "user"' })
    }

    if (body.userId === currentUser.id && body.role !== 'admin') {
      throw createError({ statusCode: 400, message: 'You cannot remove your own admin role' })
    }

    const [updated] = await db
      .update(schema.user)
      .set({ role: body.role })
      .where(eq(schema.user.id, body.userId))
      .returning({ id: schema.user.id, role: schema.user.role })

    if (!updated) throw createError({ statusCode: 404, message: 'User not found' })
    return updated
  }

  if (body.action === 'delete') {
    if (body.userId === currentUser.id) {
      throw createError({ statusCode: 400, message: 'You cannot delete yourself' })
    }

    await db.delete(schema.prediction).where(eq(schema.prediction.userId, body.userId))
    await db.delete(schema.session).where(eq(schema.session.userId, body.userId))
    await db.delete(schema.account).where(eq(schema.account.userId, body.userId))
    await db.delete(schema.user).where(eq(schema.user.id, body.userId))

    return { deleted: true }
  }

  throw createError({ statusCode: 400, message: 'Invalid action' })
})

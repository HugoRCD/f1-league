export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const body = await readBody<{ name?: string, image?: string }>(event)

  if (!body.name && typeof body.image !== 'string') {
    throw createError({ statusCode: 400, message: 'Nothing to update' })
  }

  const auth = serverAuth(event)
  const updated = await auth.api.updateUser({
    headers: event.headers,
    body: {
      name: body.name || user.name,
      image: typeof body.image === 'string' ? (body.image || null) : user.image,
    },
  })

  const updatedUser = (updated as any)?.user ?? updated
  return { id: user.id, name: updatedUser?.name ?? user.name, image: updatedUser?.image ?? user.image }
})

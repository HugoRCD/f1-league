export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const body = await readBody<{ password?: string }>(event)

  if (!body.password || body.password.length < 8 || body.password.length > 128) {
    throw createError({ statusCode: 400, message: 'Password must be between 8 and 128 characters' })
  }

  const auth = serverAuth(event)
  const ctx = await auth.$context
  const hashedPassword = await ctx.password.hash(body.password)
  const accounts = await ctx.internalAdapter.findAccounts(user.id)
  const credentialAccount = accounts.find((a: any) => a.providerId === 'credential')

  if (credentialAccount) {
    await ctx.internalAdapter.updateAccount(credentialAccount.id, {
      password: hashedPassword,
    })
  } else {
    await ctx.internalAdapter.createAccount({
      userId: user.id,
      providerId: 'credential',
      accountId: user.id,
      password: hashedPassword,
    })
  }

  return { success: true }
})

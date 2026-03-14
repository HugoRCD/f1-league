export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const auth = serverAuth(event)
  const ctx = await auth.$context
  const accounts = await ctx.internalAdapter.findAccounts(user.id)
  const hasPassword = accounts.some((a: any) => a.providerId === 'credential')

  return { hasPassword }
})

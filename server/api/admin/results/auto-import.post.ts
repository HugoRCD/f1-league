export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const { result } = await runTask('import-results')
  return result
})

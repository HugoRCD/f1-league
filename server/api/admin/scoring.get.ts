export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })
  const config = await getScoringConfig()
  log.set({ scoring: config })
  return config
})

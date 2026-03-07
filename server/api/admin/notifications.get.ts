export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  await requireUserSession(event, { user: { role: 'admin' } })
  const settings = await getNotificationSettings()
  log.set({ notifications: settings })
  return settings
})

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })
  return getNotificationSettings()
})

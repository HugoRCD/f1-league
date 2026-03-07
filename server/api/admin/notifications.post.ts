import type { NotificationSettings } from '../../utils/notifications'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<Partial<NotificationSettings>>(event)
  const current = await getNotificationSettings()

  const updated: NotificationSettings = {
    enabled: body.enabled ?? current.enabled,
    reminderDaysBefore: body.reminderDaysBefore ?? current.reminderDaysBefore,
  }

  await setNotificationSettings(updated)
  return updated
})

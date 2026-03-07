export interface NotificationSettings {
  enabled: boolean
  reminderDaysBefore: number[]
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  reminderDaysBefore: [3, 1],
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { kv } = await import('hub:kv')
  const stored = await kv.get<NotificationSettings>('notifications:settings')
  return stored ?? { ...DEFAULT_NOTIFICATION_SETTINGS }
}

export async function setNotificationSettings(settings: NotificationSettings) {
  const { kv } = await import('hub:kv')
  await kv.set('notifications:settings', settings)
}

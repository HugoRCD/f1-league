import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { createRequestLogger } from 'evlog'
import { sendReminderEmail } from '../services/resend'
import { getNotificationSettings } from '../utils/notifications'

export default defineTask({
  meta: {
    name: 'send-reminders',
    description: 'Send prediction reminder emails for upcoming races',
  },
  async run() {
    const log = createRequestLogger({ task: 'send-reminders' })

    const settings = await getNotificationSettings()
    if (!settings.enabled) {
      log.set({ result: 'disabled' })
      log.emit()
      return { result: 'disabled' }
    }

    const config = await getScoringConfig()
    const now = new Date()

    const allUsers = await db
      .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
      .from(schema.user)

    const optedOut = await db
      .select({ userId: schema.userPreferences.userId })
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.notificationsEnabled, false))

    const optedOutIds = new Set(optedOut.map(o => o.userId))
    const eligibleUsers = allUsers.filter(u => !optedOutIds.has(u.id))

    log.set({ users: { total: allUsers.length, eligible: eligibleUsers.length, optedOut: optedOutIds.size } })

    if (eligibleUsers.length === 0) {
      log.set({ result: 'no eligible users' })
      log.emit()
      return { result: 'no eligible users' }
    }

    const races = await db
      .select()
      .from(schema.race)
      .where(eq(schema.race.season, now.getFullYear()))
      .orderBy(schema.race.startAt)

    let sent = 0

    for (const daysBefore of settings.reminderDaysBefore) {
      const targetTime = new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000)
      const windowStart = new Date(targetTime.getTime() - 6 * 60 * 60 * 1000)
      const windowEnd = new Date(targetTime.getTime() + 6 * 60 * 60 * 1000)

      const upcomingRaces = races.filter(r => r.startAt >= windowStart && r.startAt <= windowEnd)

      for (const race of upcomingRaces) {
        const existingPredictions = await db
          .select({ userId: schema.prediction.userId })
          .from(schema.prediction)
          .where(eq(schema.prediction.raceId, race.id))

        const alreadyPredicted = new Set(existingPredictions.map(p => p.userId))
        const lockTime = getLockTime(race.startAt, config.lockMinutesBefore * 60 * 1000)

        for (const user of eligibleUsers) {
          if (alreadyPredicted.has(user.id)) continue

          await sendReminderEmail(user.email, {
            name: user.name,
            raceName: race.name,
            raceLocation: race.location,
            lockTime: lockTime.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            appUrl: `${process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/races/${race.id}`,
          }).catch(() => {})
          sent++
        }
      }
    }

    log.set({ reminders: { sent } })
    log.emit()
    return { result: `sent ${sent} reminders` }
  },
})

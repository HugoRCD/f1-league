import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  const raceId = getRouterParam(event, 'raceId')!
  await requireLeagueMember(event, leagueId)

  const members = await db
    .select({
      userId: schema.leagueMember.userId,
      userName: schema.user.name,
      userImage: schema.user.image,
    })
    .from(schema.leagueMember)
    .innerJoin(schema.user, eq(schema.leagueMember.userId, schema.user.id))
    .where(eq(schema.leagueMember.leagueId, leagueId))

  const userIds = members.map(m => m.userId)
  if (userIds.length === 0) return { total: 0, submitted: 0, members: [] }

  const predictions = await db
    .select({ userId: schema.prediction.userId })
    .from(schema.prediction)
    .where(and(
      eq(schema.prediction.raceId, raceId),
      eq(schema.prediction.leagueId, leagueId),
      inArray(schema.prediction.userId, userIds),
    ))

  const predictedUserIds = new Set(predictions.map(p => p.userId))

  return {
    total: members.length,
    submitted: predictedUserIds.size,
    members: members.map(m => ({
      userId: m.userId,
      userName: m.userName,
      userImage: m.userImage,
      hasPredicted: predictedUserIds.has(m.userId),
    })),
  }
})

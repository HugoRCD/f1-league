import { tool } from 'ai'
import { z } from 'zod'
import { eq, sql, ilike, or, and } from 'drizzle-orm'

export const listUsers = tool({
  description: 'List all users with optional search by name or email. Returns id, name, email, role, createdAt, and prediction count.',
  inputSchema: z.object({
    search: z.string().optional().describe('Optional search term to filter by name or email'),
  }),
  execute: async ({ search }) => {
    const { db, schema } = await import('hub:db')

    let query = db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.user.role,
        banned: schema.user.banned,
        createdAt: schema.user.createdAt,
        predictionsCount: sql<number>`(SELECT count(*)::int FROM prediction WHERE prediction."userId" = "user".id)`,
      })
      .from(schema.user)
      .orderBy(schema.user.createdAt)
      .$dynamic()

    if (search) {
      query = query.where(or(
        ilike(schema.user.name, `%${search}%`),
        ilike(schema.user.email, `%${search}%`),
      ))
    }

    const users = await query
    return users.map(u => `${u.name} (${u.email}) — role: ${u.role ?? 'user'}, predictions: ${u.predictionsCount}, id: ${u.id}${u.banned ? ' [BANNED]' : ''}`).join('\n') || 'No users found.'
  },
})

export const getUser = tool({
  description: 'Get detailed information about a specific user by id or email, including their league memberships.',
  inputSchema: z.object({
    userId: z.string().optional().describe('User ID'),
    email: z.string().optional().describe('User email'),
  }),
  execute: async ({ userId, email }) => {
    const { db, schema } = await import('hub:db')

    if (!userId && !email) return 'Provide either userId or email.'

    const condition = userId ? eq(schema.user.id, userId) : eq(schema.user.email, email!)
    const [user] = await db.select().from(schema.user).where(condition).limit(1)

    if (!user) return 'User not found.'

    const memberships = await db
      .select({
        leagueId: schema.leagueMember.leagueId,
        leagueName: schema.league.name,
        role: schema.leagueMember.role,
        joinedAt: schema.leagueMember.joinedAt,
      })
      .from(schema.leagueMember)
      .innerJoin(schema.league, eq(schema.leagueMember.leagueId, schema.league.id))
      .where(eq(schema.leagueMember.userId, user.id))

    const lines = [
      `Name: ${user.name}`,
      `Email: ${user.email}`,
      `Role: ${user.role ?? 'user'}`,
      `Banned: ${user.banned ? 'Yes' : 'No'}`,
      `Created: ${user.createdAt}`,
      `ID: ${user.id}`,
      `Leagues (${memberships.length}):`,
      ...memberships.map(m => `  - ${m.leagueName} (${m.role}) — joined ${m.joinedAt}, leagueId: ${m.leagueId}`),
    ]
    return lines.join('\n')
  },
})

export const listLeagues = tool({
  description: 'List all leagues with member count, season, creator, and pitwall status.',
  inputSchema: z.object({}),
  execute: async () => {
    const { db, schema } = await import('hub:db')

    const leagues = await db
      .select({
        id: schema.league.id,
        name: schema.league.name,
        slug: schema.league.slug,
        season: schema.league.season,
        pitwallEnabled: schema.league.pitwallEnabled,
        createdAt: schema.league.createdAt,
        creatorName: schema.user.name,
      })
      .from(schema.league)
      .innerJoin(schema.user, eq(schema.league.createdBy, schema.user.id))

    const memberCounts = new Map<string, number>()
    const allMembers = await db
      .select({ leagueId: schema.leagueMember.leagueId })
      .from(schema.leagueMember)
    for (const m of allMembers) {
      memberCounts.set(m.leagueId, (memberCounts.get(m.leagueId) ?? 0) + 1)
    }

    return leagues.map(l =>
      `${l.name} (${l.slug}) — ${memberCounts.get(l.id) ?? 0} members, season ${l.season}, pitwall: ${l.pitwallEnabled ? 'on' : 'off'}, created by ${l.creatorName}, id: ${l.id}`,
    ).join('\n') || 'No leagues found.'
  },
})

export const getLeague = tool({
  description: 'Get detailed information about a league including all its members.',
  inputSchema: z.object({
    leagueId: z.string().describe('The league ID'),
  }),
  execute: async ({ leagueId }) => {
    const { db, schema } = await import('hub:db')

    const [league] = await db.select().from(schema.league).where(eq(schema.league.id, leagueId)).limit(1)
    if (!league) return 'League not found.'

    const members = await db
      .select({
        userId: schema.leagueMember.userId,
        userName: schema.user.name,
        userEmail: schema.user.email,
        role: schema.leagueMember.role,
        joinedAt: schema.leagueMember.joinedAt,
      })
      .from(schema.leagueMember)
      .innerJoin(schema.user, eq(schema.leagueMember.userId, schema.user.id))
      .where(eq(schema.leagueMember.leagueId, leagueId))

    const lines = [
      `Name: ${league.name}`,
      `Slug: ${league.slug}`,
      `Season: ${league.season}`,
      `Pitwall: ${league.pitwallEnabled ? 'enabled' : 'disabled'}`,
      `Invite code: ${league.inviteCode}`,
      `Created: ${league.createdAt}`,
      `ID: ${league.id}`,
      `Members (${members.length}):`,
      ...members.map(m => `  - ${m.userName} (${m.userEmail}) — ${m.role}, joined ${m.joinedAt}, userId: ${m.userId}`),
    ]
    return lines.join('\n')
  },
})

export const listRaces = tool({
  description: 'List all races for the current season with date, location, and whether results exist.',
  inputSchema: z.object({}),
  execute: async () => {
    const { db, schema } = await import('hub:db')

    const races = await db
      .select({
        id: schema.race.id,
        name: schema.race.name,
        location: schema.race.location,
        startAt: schema.race.startAt,
        season: schema.race.season,
      })
      .from(schema.race)
      .orderBy(schema.race.startAt)

    const results = await db.select({ raceId: schema.raceResult.raceId }).from(schema.raceResult)
    const resultSet = new Set(results.map(r => r.raceId))

    const now = new Date()
    return races.map((r, i) => {
      const hasResult = resultSet.has(r.id)
      const isPast = r.startAt < now
      const status = hasResult ? 'Result' : isPast ? 'Finished (no result)' : 'Upcoming'
      return `R${i + 1}: ${r.name} — ${r.location}, ${r.startAt.toLocaleDateString()} [${status}], id: ${r.id}`
    }).join('\n') || 'No races found.'
  },
})

export const getStats = tool({
  description: 'Get app-wide statistics: total users, leagues, teams, drivers, races, results, and predictions.',
  inputSchema: z.object({}),
  execute: async () => {
    const { db, schema } = await import('hub:db')

    const countQuery = (table: any) => db.select({ count: sql<number>`count(*)::int` }).from(table).then(r => r[0]!.count)

    const [users, teams, drivers, races, results, predictions, leagues] = await Promise.all([
      countQuery(schema.user),
      countQuery(schema.team),
      countQuery(schema.driver),
      countQuery(schema.race),
      countQuery(schema.raceResult),
      countQuery(schema.prediction),
      countQuery(schema.league),
    ])

    return `Users: ${users}\nTeams: ${teams}\nDrivers: ${drivers}\nRaces: ${races}\nResults: ${results}\nPredictions: ${predictions}\nLeagues: ${leagues}`
  },
})

export const listPredictions = tool({
  description: 'List all predictions for a specific race in a specific league, with user names and positions.',
  inputSchema: z.object({
    raceId: z.string().describe('The race ID'),
    leagueId: z.string().describe('The league ID'),
  }),
  execute: async ({ raceId, leagueId }) => {
    const { db, schema } = await import('hub:db')

    const predictions = await db
      .select({
        userName: schema.user.name,
        positions: schema.prediction.positions,
        createdAt: schema.prediction.createdAt,
      })
      .from(schema.prediction)
      .innerJoin(schema.user, eq(schema.prediction.userId, schema.user.id))
      .where(and(
        eq(schema.prediction.raceId, raceId),
        eq(schema.prediction.leagueId, leagueId),
      ))

    if (!predictions.length) return 'No predictions found for this race/league combination.'

    const drivers = await db.select().from(schema.driver)
    const driverMap = new Map(drivers.map(d => [d.id, `${d.firstName} ${d.lastName}`]))

    return predictions.map(p => {
      const positions = (p.positions as string[]).map((dId, i) => `P${i + 1}: ${driverMap.get(dId) ?? dId}`).join(', ')
      return `${p.userName}: ${positions}`
    }).join('\n')
  },
})

export const assignUserToLeague = tool({
  description: 'Add a user to a league with a specified role (admin or member). Requires userId and leagueId.',
  inputSchema: z.object({
    userId: z.string().describe('The user ID to add'),
    leagueId: z.string().describe('The league ID'),
    role: z.enum(['admin', 'member']).default('member').describe('Role in the league'),
  }),
  execute: async ({ userId, leagueId, role }) => {
    const { db, schema } = await import('hub:db')

    const [user] = await db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, userId)).limit(1)
    if (!user) return 'User not found.'

    const [league] = await db.select({ name: schema.league.name }).from(schema.league).where(eq(schema.league.id, leagueId)).limit(1)
    if (!league) return 'League not found.'

    const [existing] = await db
      .select()
      .from(schema.leagueMember)
      .where(and(
        eq(schema.leagueMember.leagueId, leagueId),
        eq(schema.leagueMember.userId, userId),
      ))
      .limit(1)

    if (existing) return `${user.name} is already a member of ${league.name} (role: ${existing.role}).`

    await db.insert(schema.leagueMember).values({ leagueId, userId, role })
    return `Successfully added ${user.name} to ${league.name} as ${role}.`
  },
})

export const removeUserFromLeague = tool({
  description: 'Remove a user from a league.',
  inputSchema: z.object({
    userId: z.string().describe('The user ID to remove'),
    leagueId: z.string().describe('The league ID'),
  }),
  execute: async ({ userId, leagueId }) => {
    const { db, schema } = await import('hub:db')

    const [user] = await db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, userId)).limit(1)
    if (!user) return 'User not found.'

    const [league] = await db.select({ name: schema.league.name }).from(schema.league).where(eq(schema.league.id, leagueId)).limit(1)
    if (!league) return 'League not found.'

    const result = await db
      .delete(schema.leagueMember)
      .where(and(
        eq(schema.leagueMember.leagueId, leagueId),
        eq(schema.leagueMember.userId, userId),
      ))
      .returning()

    if (!result.length) return `${user.name} is not a member of ${league.name}.`
    return `Successfully removed ${user.name} from ${league.name}.`
  },
})

export const updateUserRole = tool({
  description: 'Change a user\'s app-wide role (admin or user) or their role within a specific league.',
  inputSchema: z.object({
    userId: z.string().describe('The user ID'),
    role: z.enum(['admin', 'user']).describe('The new role'),
    leagueId: z.string().optional().describe('If provided, updates the league-specific role instead of the app-wide role'),
  }),
  execute: async ({ userId, role, leagueId }) => {
    const { db, schema } = await import('hub:db')

    const [user] = await db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, userId)).limit(1)
    if (!user) return 'User not found.'

    if (leagueId) {
      const leagueRole = role === 'user' ? 'member' : 'admin'
      const [updated] = await db
        .update(schema.leagueMember)
        .set({ role: leagueRole })
        .where(and(
          eq(schema.leagueMember.leagueId, leagueId),
          eq(schema.leagueMember.userId, userId),
        ))
        .returning()
      if (!updated) return `${user.name} is not a member of this league.`
      return `Updated ${user.name}'s league role to ${leagueRole}.`
    }

    const [updated] = await db
      .update(schema.user)
      .set({ role })
      .where(eq(schema.user.id, userId))
      .returning({ id: schema.user.id, role: schema.user.role })

    if (!updated) return 'User not found.'
    return `Updated ${user.name}'s app-wide role to ${role}.`
  },
})

export const updateLeague = tool({
  description: 'Update league settings such as name, description, or pitwallEnabled.',
  inputSchema: z.object({
    leagueId: z.string().describe('The league ID'),
    name: z.string().optional().describe('New league name'),
    description: z.string().optional().describe('New league description'),
    pitwallEnabled: z.boolean().optional().describe('Enable or disable Pitwall AI predictions'),
  }),
  execute: async ({ leagueId, name, description, pitwallEnabled }) => {
    const { db, schema } = await import('hub:db')

    const [league] = await db.select().from(schema.league).where(eq(schema.league.id, leagueId)).limit(1)
    if (!league) return 'League not found.'

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (pitwallEnabled !== undefined) updates.pitwallEnabled = pitwallEnabled

    if (Object.keys(updates).length === 0) return 'Nothing to update.'

    const [updated] = await db
      .update(schema.league)
      .set(updates)
      .where(eq(schema.league.id, leagueId))
      .returning()

    const changes = Object.entries(updates).map(([k, v]) => `${k}: ${v}`).join(', ')
    return `Updated league "${updated!.name}": ${changes}.`
  },
})

export const deleteUser = tool({
  description: 'Permanently delete a user and all their data (predictions, sessions, accounts). This action is irreversible.',
  inputSchema: z.object({
    userId: z.string().describe('The user ID to delete'),
  }),
  execute: async ({ userId }) => {
    const { db, schema } = await import('hub:db')

    const [user] = await db.select({ name: schema.user.name, email: schema.user.email }).from(schema.user).where(eq(schema.user.id, userId)).limit(1)
    if (!user) return 'User not found.'

    await db.delete(schema.prediction).where(eq(schema.prediction.userId, userId))
    await db.delete(schema.leagueMember).where(eq(schema.leagueMember.userId, userId))
    await db.delete(schema.session).where(eq(schema.session.userId, userId))
    await db.delete(schema.account).where(eq(schema.account.userId, userId))
    await db.delete(schema.user).where(eq(schema.user.id, userId))

    return `Deleted user ${user.name} (${user.email}) and all associated data.`
  },
})

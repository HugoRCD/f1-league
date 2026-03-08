import { and, eq } from 'drizzle-orm'

import type { H3Event } from 'h3'

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export async function requireLeagueMember(event: H3Event, leagueId: string) {
  const { user } = await requireUserSession(event)
  const { db, schema } = await import('hub:db')

  const [membership] = await db
    .select()
    .from(schema.leagueMember)
    .where(and(
      eq(schema.leagueMember.leagueId, leagueId),
      eq(schema.leagueMember.userId, user.id),
    ))
    .limit(1)

  if (!membership) {
    throw createError({ statusCode: 403, message: 'You are not a member of this league' })
  }

  return { user, membership }
}

export async function requireLeagueAdmin(event: H3Event, leagueId: string) {
  const { user, membership } = await requireLeagueMember(event, leagueId)

  if (membership.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only league admins can perform this action' })
  }

  return { user, membership }
}

export async function getLeagueById(leagueId: string) {
  const { db, schema } = await import('hub:db')

  const [league] = await db
    .select()
    .from(schema.league)
    .where(eq(schema.league.id, leagueId))
    .limit(1)

  if (!league) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }

  return league
}

export async function getLeagueScoringConfig(leagueId: string): Promise<import('./scoring').ScoringConfig> {
  const league = await getLeagueById(leagueId)

  if (league.scoringConfig) {
    return league.scoringConfig as import('./scoring').ScoringConfig
  }

  return getScoringConfig()
}

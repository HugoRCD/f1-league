import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { ScoringConfig } from '../../../utils/scoring'

export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueAdmin(event, leagueId)

  const body = await readBody<Partial<ScoringConfig>>(event)

  const current = await getLeagueScoringConfig(leagueId)

  const config: ScoringConfig = {
    exact: body.exact ?? current.exact,
    offBy1: body.offBy1 ?? current.offBy1,
    offBy2: body.offBy2 ?? current.offBy2,
    offBy3Plus: body.offBy3Plus ?? current.offBy3Plus,
    notInTop10: body.notInTop10 ?? current.notInTop10,
    lockMinutesBefore: body.lockMinutesBefore ?? current.lockMinutesBefore,
    openDaysBefore: body.openDaysBefore ?? current.openDaysBefore,
  }

  await db
    .update(schema.league)
    .set({ scoringConfig: config })
    .where(eq(schema.league.id, leagueId))

  return config
})

import type { ScoringConfig } from '../../utils/scoring'
import { kv } from 'hub:kv'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, { user: { role: 'admin' } })

  const body = await readBody<Partial<ScoringConfig>>(event)

  const current = await getScoringConfig()
  const updated: ScoringConfig = {
    exact: body.exact ?? current.exact,
    offBy1: body.offBy1 ?? current.offBy1,
    offBy2: body.offBy2 ?? current.offBy2,
    offBy3Plus: body.offBy3Plus ?? current.offBy3Plus,
    notInTop10: body.notInTop10 ?? current.notInTop10,
    lockMinutesBefore: body.lockMinutesBefore ?? current.lockMinutesBefore,
  }

  await kv.set('scoring:config', updated)
  invalidateScoringConfigCache()

  return updated
})

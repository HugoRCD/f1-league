export interface ScoringConfig {
  exact: number
  offBy1: number
  offBy2: number
  offBy3Plus: number
  notInTop10: number
  lockMinutesBefore: number
  openDaysBefore: number
}

export const DEFAULT_SCORING: ScoringConfig = {
  exact: 5,
  offBy1: 3,
  offBy2: 2,
  offBy3Plus: 1,
  notInTop10: 0,
  lockMinutesBefore: 5,
  openDaysBefore: 4,
}

let _cachedConfig: ScoringConfig | null = null

export async function getScoringConfig(): Promise<ScoringConfig> {
  if (_cachedConfig) return _cachedConfig

  const { kv } = await import('hub:kv')
  const stored = await kv.get<ScoringConfig>('scoring:config')
  _cachedConfig = stored ?? { ...DEFAULT_SCORING }
  return _cachedConfig
}

export function invalidateScoringConfigCache() {
  _cachedConfig = null
}

export interface PositionScore {
  driverId: string
  predicted: number
  actual: number | null
  points: number
}

export interface RaceScore {
  total: number
  exactHits: number
  details: PositionScore[]
}

export function calculateRaceScore(prediction: string[], result: string[], config: ScoringConfig): RaceScore {
  const details: PositionScore[] = []
  let total = 0
  let exactHits = 0

  for (let i = 0; i < prediction.length; i++) {
    const driverId = prediction[i]!
    const actualIndex = result.indexOf(driverId)

    if (actualIndex === -1) {
      details.push({ driverId, predicted: i + 1, actual: null, points: config.notInTop10 })
      total += config.notInTop10
      continue
    }

    const d = Math.abs(i - actualIndex)
    let points: number

    if (d === 0) {
      points = config.exact
      exactHits++
    } else if (d === 1) {
      points = config.offBy1 
    } else if (d === 2) {
      points = config.offBy2 
    } else {
      points = config.offBy3Plus 
    }

    total += points
    details.push({ driverId, predicted: i + 1, actual: actualIndex + 1, points })
  }

  return { total, exactHits, details }
}

export interface PlayerRaceStanding {
  userId: string
  userName: string
  userImage?: string | null
  total: number
  exactHits: number
  details: PositionScore[]
}

export function rankRaceStandings(standings: PlayerRaceStanding[]): PlayerRaceStanding[] {
  return [...standings].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total
    return b.exactHits - a.exactHits
  })
}

export interface SeasonStanding {
  userId: string
  userName: string
  userImage: string | null
  totalPoints: number
  raceWins: number
  totalExactHits: number
  raceResults: { raceId: string, total: number, exactHits: number }[]
}

export function calculateSeasonStandings(
  allRaceStandings: { raceId: string, standings: PlayerRaceStanding[] }[],
): SeasonStanding[] {
  const playerMap = new Map<string, SeasonStanding>()

  for (const { raceId, standings } of allRaceStandings) {
    const ranked = rankRaceStandings(standings)
    const winnerId = ranked[0]?.userId

    for (const player of ranked) {
      if (!playerMap.has(player.userId)) {
        playerMap.set(player.userId, {
          userId: player.userId,
          userName: player.userName,
          userImage: player.userImage ?? null,
          totalPoints: 0,
          raceWins: 0,
          totalExactHits: 0,
          raceResults: [],
        })
      }

      const entry = playerMap.get(player.userId)!
      entry.totalPoints += player.total
      entry.totalExactHits += player.exactHits
      entry.raceResults.push({ raceId, total: player.total, exactHits: player.exactHits })

      if (player.userId === winnerId) {
        entry.raceWins++
      }
    }
  }

  return [...playerMap.values()].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    return b.raceWins - a.raceWins
  })
}

export async function getLockOffsetMs(): Promise<number> {
  const config = await getScoringConfig()
  return config.lockMinutesBefore * 60 * 1000
}

export function isRaceLocked(startAt: Date, lockOffsetMs: number = 5 * 60 * 1000): boolean {
  return Date.now() >= startAt.getTime() - lockOffsetMs
}

export function getLockTime(startAt: Date, lockOffsetMs: number = 5 * 60 * 1000): Date {
  return new Date(startAt.getTime() - lockOffsetMs)
}

export function isRaceOpen(startAt: Date, openOffsetMs: number): boolean {
  const openTime = startAt.getTime() - openOffsetMs
  return Date.now() >= openTime
}

export function getOpenTime(startAt: Date, openOffsetMs: number): Date {
  return new Date(startAt.getTime() - openOffsetMs)
}

export interface RaceWindow {
  locked: boolean
  open: boolean
  lockTime: string
  openTime: string
}

export function getRaceWindow(startAt: Date, config: ScoringConfig): RaceWindow {
  const lockOffsetMs = config.lockMinutesBefore * 60 * 1000
  const openOffsetMs = config.openDaysBefore * 24 * 60 * 60 * 1000

  return {
    locked: isRaceLocked(startAt, lockOffsetMs),
    open: isRaceOpen(startAt, openOffsetMs) && !isRaceLocked(startAt, lockOffsetMs),
    lockTime: getLockTime(startAt, lockOffsetMs).toISOString(),
    openTime: getOpenTime(startAt, openOffsetMs).toISOString(),
  }
}

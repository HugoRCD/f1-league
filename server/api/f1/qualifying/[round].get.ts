const F1_API = 'https://f1api.dev/api'
const SEASON = new Date().getFullYear()

export default defineCachedEventHandler(async (event) => {
  const round = getRouterParam(event, 'round')!

  try {
    const data = await $fetch<any>(`${F1_API}/${SEASON}/${round}/qualy`)
    const results = data.races?.qualyResults ?? data.qualyResults ?? []

    return results.map((entry: any) => ({
      position: entry.gridPosition ?? entry.position,
      driverName: `${entry.driver?.name ?? ''} ${entry.driver?.surname ?? ''}`.trim(),
      driverCode: entry.driver?.shortName ?? '',
      teamName: entry.team?.teamName ?? '',
      teamId: entry.teamId ?? '',
      q1: entry.q1 ?? null,
      q2: entry.q2 ?? null,
      q3: entry.q3 ?? null,
    }))
  }
  catch {
    return []
  }
}, { maxAge: 300, name: 'f1-qualifying' })

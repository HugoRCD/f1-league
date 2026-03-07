const F1_API = 'https://f1api.dev/api'
const SEASON = new Date().getFullYear()

export default defineCachedEventHandler(async (event) => {
  const round = getRouterParam(event, 'round')!

  try {
    const data = await $fetch<any>(`${F1_API}/${SEASON}/${round}/race`)
    const results = data.races?.raceResults ?? data.raceResults ?? data.races?.results ?? []

    return results.map((entry: any) => ({
      position: entry.position ?? entry.gridPosition,
      driverName: `${entry.driver?.name ?? ''} ${entry.driver?.surname ?? ''}`.trim(),
      driverCode: entry.driver?.shortName ?? '',
      teamName: entry.team?.teamName ?? '',
      teamId: entry.teamId ?? '',
      status: entry.status ?? 'Finished',
      laps: entry.laps ?? null,
      time: entry.time ?? null,
    }))
  }
  catch {
    return []
  }
}, { maxAge: 300, name: 'f1-race-result' })

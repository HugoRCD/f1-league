const F1_API = 'https://f1api.dev/api'

export default defineCachedEventHandler(async (event) => {
  const round = getRouterParam(event, 'round')!

  try {
    const data = await $fetch<any>(`${F1_API}/current/${round}/qualy`)
    const results = data.races?.results ?? data.results ?? []

    return results.map((entry: any) => ({
      position: entry.gridPosition ?? entry.position ?? entry.classificationId,
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

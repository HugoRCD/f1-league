const JOLPICA_API = 'https://api.jolpi.ca/ergast/f1'
const SEASON = new Date().getFullYear()

export default defineCachedEventHandler(async (event) => {
  const round = getRouterParam(event, 'round')!

  try {
    const data = await $fetch<any>(`${JOLPICA_API}/${SEASON}/${round}/results/`)
    const races = data.MRData?.RaceTable?.Races ?? []
    if (!races.length) return []

    return (races[0].Results ?? []).map((entry: any) => ({
      position: Number(entry.position),
      driverName: `${entry.Driver?.givenName ?? ''} ${entry.Driver?.familyName ?? ''}`.trim(),
      driverCode: entry.Driver?.code ?? '',
      teamName: entry.Constructor?.name ?? '',
      teamId: entry.Constructor?.constructorId ?? '',
      status: entry.status ?? 'Finished',
      laps: entry.laps ? Number(entry.laps) : null,
      time: entry.Time?.time ?? null,
    }))
  }
  catch {
    return []
  }
}, { maxAge: 300, name: 'f1-race-result' })

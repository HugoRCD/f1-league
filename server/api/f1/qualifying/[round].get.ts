const JOLPICA_API = 'https://api.jolpi.ca/ergast/f1'
const SEASON = new Date().getFullYear()

export default defineCachedEventHandler(async (event): Promise<any[]> => {
  const round = getRouterParam(event, 'round')!

  try {
    const data: any = await $fetch(`${JOLPICA_API}/${SEASON}/${round}/qualifying/`)
    const races: any[] = data.MRData?.RaceTable?.Races ?? []
    if (!races.length) return []

    return (races[0].QualifyingResults ?? []).map((entry: any) => ({
      position: Number(entry.position),
      driverName: `${entry.Driver?.givenName ?? ''} ${entry.Driver?.familyName ?? ''}`.trim(),
      driverCode: entry.Driver?.code ?? '',
      teamName: entry.Constructor?.name ?? '',
      teamId: entry.Constructor?.constructorId ?? '',
      q1: entry.Q1 ?? null,
      q2: entry.Q2 ?? null,
      q3: entry.Q3 ?? null,
    }))
  } catch {
    return []
  }
}, { maxAge: 300, swr: true, name: 'f1-qualifying' })

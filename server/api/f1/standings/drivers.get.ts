const JOLPICA_API = 'https://api.jolpi.ca/ergast/f1'

export default defineCachedEventHandler(async () => {
  try {
    const data = await $fetch<any>(`${JOLPICA_API}/current/driverStandings/`)
    const lists = data.MRData?.StandingsTable?.StandingsLists ?? []
    if (!lists.length) return []

    return (lists[0].DriverStandings ?? []).map((entry: any) => ({
      position: Number(entry.position),
      points: Number(entry.points),
      wins: Number(entry.wins),
      driverName: `${entry.Driver.givenName} ${entry.Driver.familyName}`,
      driverCode: entry.Driver.code,
      teamName: entry.Constructors?.[0]?.name ?? '',
      teamId: entry.Constructors?.[0]?.constructorId ?? '',
    }))
  }
  catch {
    return []
  }
}, { maxAge: 300, name: 'f1-standings-drivers' })

const JOLPICA_API = 'https://api.jolpi.ca/ergast/f1'

export default defineCachedEventHandler(async () => {
  try {
    const data = await $fetch<any>(`${JOLPICA_API}/current/constructorStandings/`)
    const lists = data.MRData?.StandingsTable?.StandingsLists ?? []
    if (!lists.length) return []

    return (lists[0].ConstructorStandings ?? []).map((entry: any) => ({
      position: Number(entry.position),
      points: Number(entry.points),
      wins: Number(entry.wins),
      teamName: entry.Constructor.name,
      teamId: entry.Constructor.constructorId,
    }))
  }
  catch {
    return []
  }
}, { maxAge: 300, name: 'f1-standings-teams' })

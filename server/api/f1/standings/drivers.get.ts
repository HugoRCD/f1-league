const F1_API = 'https://f1api.dev/api'

export default defineCachedEventHandler(async () => {
  const data = await $fetch<any>(`${F1_API}/current/drivers-championship`)

  return (data.drivers_championship ?? []).map((entry: any) => ({
    position: entry.position,
    points: entry.points,
    wins: entry.wins,
    driverName: `${entry.driver.name} ${entry.driver.surname}`,
    driverCode: entry.driver.shortName,
    teamName: entry.team.teamName,
    teamId: entry.teamId,
  }))
}, { maxAge: 300, name: 'f1-standings-drivers' })

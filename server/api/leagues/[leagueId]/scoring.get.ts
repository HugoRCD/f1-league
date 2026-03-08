export default defineEventHandler(async (event) => {
  const leagueId = getRouterParam(event, 'leagueId')!
  await requireLeagueMember(event, leagueId)

  const config = await getLeagueScoringConfig(leagueId)
  return config
})

export interface League {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  season: number
  createdAt: string
  role: string
  joinedAt: string
  memberCount: number
}

export function useLeagues() {
  return useCachedFetch<League[]>('/api/leagues', { key: 'leagues' })
}

export function useCurrentLeague() {
  const route = useRoute()
  const slug = computed(() => route.params.slug as string | undefined)

  const { data: leagues } = useLeagues()

  const league = computed(() => {
    if (!slug.value || !leagues.value) return null
    return leagues.value.find(l => l.slug === slug.value) ?? null
  })

  const leagueId = computed(() => league.value?.id ?? null)
  const isLeagueAdmin = computed(() => league.value?.role === 'admin')

  return { league, leagueId, slug, isLeagueAdmin }
}

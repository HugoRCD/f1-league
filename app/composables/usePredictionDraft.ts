export function usePredictionDraft(leagueId: MaybeRefOrGetter<string | null>, raceId: string) {
  const key = computed(() => `f1-prediction-${toValue(leagueId)}-${raceId}`)
  const draft = import.meta.client ? useLocalStorage<string[]>(key, []) : ref<string[]>([])

  function setFromServer(positions: string[]) {
    draft.value = [...positions]
  }

  function clear() {
    draft.value = []
  }

  return { draft, setFromServer, clear }
}

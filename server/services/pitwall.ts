import { f1PredictionAgent } from '../ai/agent'

export async function generatePitwallPrediction(context: {
  raceName: string
  raceLocation: string
  raceRound: number
  availableDriverIds: { id: string, lastName: string }[]
}): Promise<{ prediction: string[], reasoning: string }> {
  const driverMap = new Map(context.availableDriverIds.map(d => [d.lastName.toLowerCase(), d.id]))

  const { output } = await f1PredictionAgent.generate({
    prompt: `Predict the Top 10 finishing order for Round ${context.raceRound}, the ${context.raceName} in ${context.raceLocation}. Use your tools to check the starting grid and standings first.`,
  })

  const predictedIds: string[] = []
  if (output) {
    for (const name of output.top10) {
      const id = driverMap.get(name.toLowerCase())
      if (id && !predictedIds.includes(id)) {
        predictedIds.push(id)
      }
    }
  }

  if (predictedIds.length < 10) {
    for (const { id } of context.availableDriverIds) {
      if (!predictedIds.includes(id)) {
        predictedIds.push(id)
        if (predictedIds.length >= 10) break
      }
    }
  }

  return {
    prediction: predictedIds.slice(0, 10),
    reasoning: output?.reasoning || 'No reasoning available',
  }
}

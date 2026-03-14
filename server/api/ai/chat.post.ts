import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { pitwallModel, pitwallSystem, pitwallTools } from '../../ai/agent'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event)

  const { messages } = await readBody(event)
  log.set({
    user: { id: user.id },
    chat: { mode: 'pitwall', messageCount: messages?.length ?? 0 },
  })

  return streamText({
    model: pitwallModel,
    system: pitwallSystem,
    messages: await convertToModelMessages(messages),
    tools: pitwallTools,
    stopWhen: stepCountIs(10),
  }).toUIMessageStreamResponse()
})

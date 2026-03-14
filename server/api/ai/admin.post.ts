import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { adminModel, adminSystem, adminTools } from '../../ai/admin-agent'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event, { user: { role: 'admin' } })

  const { messages } = await readBody(event)
  log.set({
    user: { id: user.id },
    chat: { mode: 'admin', messageCount: messages?.length ?? 0 },
  })

  return streamText({
    model: adminModel,
    system: adminSystem,
    messages: await convertToModelMessages(messages),
    tools: adminTools,
    stopWhen: stepCountIs(10),
  }).toUIMessageStreamResponse()
})

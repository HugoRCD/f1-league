import { f1Agent } from '../../ai/agent'

export default defineEventHandler(async (event) => {
  const log = useLogger(event)
  const { user } = await requireUserSession(event)
  log.set({ user: { id: user.id }, chat: { messageCount: 0 } })

  const { messages } = await readBody(event)
  log.set({ chat: { messageCount: messages?.length ?? 0 } })

  const result = await f1Agent.stream({ messages })

  return result.toDataStreamResponse()
})

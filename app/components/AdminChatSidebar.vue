<script setup lang="ts">
import { DefaultChatTransport, isTextUIPart, isToolUIPart, getToolName } from 'ai'
import type { ToolUIPart, DynamicToolUIPart } from 'ai'
import { Chat } from '@ai-sdk/vue'
import { isToolStreaming } from '@nuxt/ui/utils/ai'

const { open } = useAdminChat()

const input = ref('')

const toast = useToast()

const chat = new Chat({
  transport: new DefaultChatTransport({
    api: '/api/ai/admin',
  }),
  onError: (error) => {
    let message = error.message
    if (typeof message === 'string' && message[0] === '{') {
      try {
        message = JSON.parse(message).message || message
      }
      catch {}
    }
    toast.add({
      description: message,
      icon: 'i-lucide-alert-circle',
      color: 'error',
      duration: 0,
    })
  },
})

const canClear = computed(() => chat.messages.length > 0)

function onSubmit() {
  if (!input.value.trim()) return
  chat.sendMessage({ text: input.value })
  input.value = ''
}

function clearMessages() {
  if (chat.status === 'streaming') {
    chat.stop()
  }
  chat.messages = []
}

type ToolPart = ToolUIPart | DynamicToolUIPart
type ToolState = ToolPart['state']

function getToolMessage(state: ToolState, toolName: string) {
  const searchVerb = state === 'output-available' ? 'Searched' : 'Searching'
  const readVerb = state === 'output-available' ? 'Read' : 'Reading'
  const updateVerb = state === 'output-available' ? 'Updated' : 'Updating'
  const addVerb = state === 'output-available' ? 'Added' : 'Adding'
  const removeVerb = state === 'output-available' ? 'Removed' : 'Removing'
  const deleteVerb = state === 'output-available' ? 'Deleted' : 'Deleting'

  const messages: Record<string, string> = {
    listUsers: `${searchVerb} users`,
    getUser: `${readVerb} user details`,
    listLeagues: `${searchVerb} leagues`,
    getLeague: `${readVerb} league details`,
    listRaces: `${searchVerb} races`,
    getStats: `${readVerb} app statistics`,
    listPredictions: `${readVerb} predictions`,
    assignUserToLeague: `${addVerb} user to league`,
    removeUserFromLeague: `${removeVerb} user from league`,
    updateUserRole: `${updateVerb} user role`,
    updateLeague: `${updateVerb} league settings`,
    deleteUser: `${deleteVerb} user`,
  }

  return messages[toolName] || `${searchVerb} ${toolName}`
}

function getToolText(part: ToolPart) {
  return getToolMessage(part.state, getToolName(part))
}

function getToolIcon(part: ToolPart): string {
  const toolName = getToolName(part)
  const readTools = ['getUser', 'getLeague', 'getStats', 'listPredictions']
  const writeTools = ['assignUserToLeague', 'removeUserFromLeague', 'updateUserRole', 'updateLeague', 'deleteUser']

  if (readTools.includes(toolName)) return 'i-lucide-file-text'
  if (writeTools.includes(toolName)) return 'i-lucide-pencil'
  return 'i-lucide-search'
}

const suggestions = [
  'How many users are on the platform?',
  'List all leagues and their members',
  'Show me the race calendar',
]

function askQuestion(question: string) {
  input.value = question
  onSubmit()
}

defineShortcuts({
  meta_j: {
    handler: () => {
      open.value = !open.value
    },
    usingInput: true,
  },
})
</script>

<template>
  <USidebar
    v-model:open="open"
    side="right"
    title="Admin AI"
    rail
    :style="{ '--sidebar-width': '24rem' }"
    :ui="{ footer: 'p-0', actions: 'gap-0.5' }"
  >
    <template #actions>
      <UTooltip v-if="canClear" text="Clear messages">
        <UButton
          icon="i-lucide-list-x"
          color="neutral"
          variant="ghost"
          @click="clearMessages"
        />
      </UTooltip>
    </template>

    <template #close>
      <UTooltip text="Close" :kbds="['meta', 'j']">
        <UButton
          icon="i-lucide-panel-right-close"
          color="neutral"
          variant="ghost"
          aria-label="Close"
          @click="open = false"
        />
      </UTooltip>
    </template>

    <UChatMessages
      v-if="chat.messages.length"
      should-auto-scroll
      :messages="chat.messages"
      :status="chat.status"
      compact
      class="px-0 gap-2"
      :user="{ ui: { container: 'max-w-full' } }"
    >
      <template #content="{ message }">
        <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
          <UChatTool
            v-if="isToolUIPart(part)"
            :text="getToolText(part)"
            :icon="getToolIcon(part)"
            :streaming="isToolStreaming(part)"
          />
          <div
            v-else-if="isTextUIPart(part) && part.text.length > 0"
            class="prose prose-sm prose-invert max-w-none text-sm/6 *:first:mt-0 *:last:mb-0"
            v-html="part.text"
          />
        </template>
      </template>
    </UChatMessages>

    <div v-else class="flex flex-col gap-3 px-1">
      <p class="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
        Suggestions
      </p>
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        class="text-left text-sm text-zinc-400 hover:text-white px-3 py-2 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors"
        @click="askQuestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>

    <template #footer>
      <UChatPrompt
        v-model="input"
        :error="chat.error"
        placeholder="Ask anything about users, leagues..."
        variant="naked"
        size="sm"
        autofocus
        :ui="{ base: 'px-0' }"
        class="px-4"
        @submit="onSubmit"
      >
        <template #footer>
          <div class="flex items-center gap-1.5 text-xs text-dimmed">
            <span class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-shield" class="size-3" />
              Admin only
            </span>
          </div>

          <UChatPromptSubmit
            size="sm"
            :status="chat.status"
            :disabled="!input.trim()"
            @stop="chat.stop()"
            @reload="chat.regenerate()"
          />
        </template>
      </UChatPrompt>
    </template>
  </USidebar>
</template>

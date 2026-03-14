<script setup lang="ts">
import { DefaultChatTransport, isTextUIPart, isToolUIPart, getToolName } from 'ai'
import type { ToolUIPart, DynamicToolUIPart } from 'ai'
import { Chat } from '@ai-sdk/vue'
import { isToolStreaming } from '@nuxt/ui/utils/ai'

const { open, mode, setMode } = usePitwallChat()
const { user } = useUserSession()

const isSuperAdmin = computed(() => user.value?.role === 'admin')
const input = ref('')
const toast = useToast()

function handleError(error: Error) {
  let { message } = error
  if (typeof message === 'string' && message[0] === '{') {
    try {
      message = JSON.parse(message).message || message
    } catch {
      // malformed JSON
    }
  }
  toast.add({ description: message, icon: 'i-lucide-alert-circle', color: 'error', duration: 0 })
}

const pitwallChat = new Chat({
  transport: new DefaultChatTransport({ api: '/api/ai/chat' }),
  onError: handleError,
})

const adminChat = new Chat({
  transport: new DefaultChatTransport({ api: '/api/ai/admin' }),
  onError: handleError,
})

const activeChat = computed(() => mode.value === 'admin' ? adminChat : pitwallChat)
const canClear = computed(() => activeChat.value.messages.length > 0)
const title = computed(() => mode.value === 'admin' ? 'Admin AI' : 'Pitwall')
const placeholder = computed(() => mode.value === 'admin' ? 'Ask anything about users, leagues...' : 'Ask about standings, news, predictions...')

function onSubmit() {
  if (!input.value.trim()) return
  activeChat.value.sendMessage({ text: input.value })
  input.value = ''
}

function clearMessages() {
  const chat = activeChat.value
  if (chat.status === 'streaming') chat.stop()
  chat.messages = []
}

type ToolPart = ToolUIPart | DynamicToolUIPart

const toolMeta: Record<string, { active: string, done: string, suffix: string, icon: string }> = {
  getStartingGrid: { active: 'Checking', done: 'Checked', suffix: 'starting grid', icon: 'i-lucide-search' },
  getDriverStandings: { active: 'Checking', done: 'Checked', suffix: 'driver standings', icon: 'i-lucide-search' },
  getTeamStandings: { active: 'Checking', done: 'Checked', suffix: 'team standings', icon: 'i-lucide-search' },
  getRaceResult: { active: 'Reading', done: 'Read', suffix: 'race result', icon: 'i-lucide-search' },
  getRaceCalendar: { active: 'Checking', done: 'Checked', suffix: 'race calendar', icon: 'i-lucide-search' },
  getLatestNews: { active: 'Reading', done: 'Read', suffix: 'latest news', icon: 'i-lucide-newspaper' },
  getAvailableDrivers: { active: 'Loading', done: 'Loaded', suffix: 'drivers', icon: 'i-lucide-search' },
  getLeagueStandings: { active: 'Checking', done: 'Checked', suffix: 'league standings', icon: 'i-lucide-search' },
  listUsers: { active: 'Searching', done: 'Searched', suffix: 'users', icon: 'i-lucide-search' },
  getUser: { active: 'Reading', done: 'Read', suffix: 'user details', icon: 'i-lucide-file-text' },
  listLeagues: { active: 'Searching', done: 'Searched', suffix: 'leagues', icon: 'i-lucide-search' },
  getLeague: { active: 'Reading', done: 'Read', suffix: 'league details', icon: 'i-lucide-file-text' },
  listRaces: { active: 'Searching', done: 'Searched', suffix: 'races', icon: 'i-lucide-search' },
  getStats: { active: 'Reading', done: 'Read', suffix: 'app statistics', icon: 'i-lucide-file-text' },
  listPredictions: { active: 'Reading', done: 'Read', suffix: 'predictions', icon: 'i-lucide-file-text' },
  assignUserToLeague: { active: 'Adding', done: 'Added', suffix: 'user to league', icon: 'i-lucide-pencil' },
  removeUserFromLeague: { active: 'Removing', done: 'Removed', suffix: 'user from league', icon: 'i-lucide-pencil' },
  updateUserRole: { active: 'Updating', done: 'Updated', suffix: 'user role', icon: 'i-lucide-pencil' },
  updateLeague: { active: 'Updating', done: 'Updated', suffix: 'league settings', icon: 'i-lucide-pencil' },
  deleteUser: { active: 'Deleting', done: 'Deleted', suffix: 'user', icon: 'i-lucide-pencil' },
  rawQuery: { active: 'Running', done: 'Ran', suffix: 'SQL query', icon: 'i-lucide-terminal' },
  rawExecute: { active: 'Executing', done: 'Executed', suffix: 'SQL mutation', icon: 'i-lucide-terminal' },
}

function getToolText(part: ToolPart) {
  const meta = toolMeta[getToolName(part)]
  if (!meta) return getToolName(part)
  return `${part.state === 'output-available' ? meta.done : meta.active} ${meta.suffix}`
}

function getToolIcon(part: ToolPart) {
  return toolMeta[getToolName(part)]?.icon ?? 'i-lucide-search'
}

const pitwallSuggestions = [
  'Who is leading the championship?',
  'What are the latest F1 news?',
  'Who should I pick for my Top 10 this weekend?',
]

const adminSuggestions = [
  'How many users are on the platform?',
  'List all leagues with their member counts',
  'Show me the details of a specific user',
]

const suggestions = computed(() => mode.value === 'admin' ? adminSuggestions : pitwallSuggestions)

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
    :title
    rail
    :style="{ '--sidebar-width': '24rem' }"
    :ui="{
      container: 'bg-zinc-950 border-zinc-800/80',
      inner: 'bg-zinc-950 divide-zinc-800/80',
      header: 'flex-col p-0 !min-h-0 h-[calc(4px+3.5rem)]',
      body: 'gap-3',
      footer: 'p-0 border-t border-zinc-800/80',
      actions: 'gap-0.5',
    }"
  >
    <template #header>
      <div class="h-[3px] bg-[#E10600] w-full shrink-0" />
      <div class="flex items-center gap-1.5 px-4 h-14 w-full">
        <p class="text-zinc-100 font-semibold truncate flex-1">
          {{ title }}
        </p>
        <UTooltip v-if="canClear" text="Clear messages">
          <UButton icon="i-lucide-list-x" color="neutral" variant="ghost" @click="clearMessages" />
        </UTooltip>
        <UTooltip text="Close" :kbds="['meta', 'j']">
          <UButton icon="i-lucide-panel-right-close" color="neutral" variant="ghost" aria-label="Close" @click="open = false" />
        </UTooltip>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <div v-if="isSuperAdmin" class="flex gap-1 rounded-lg bg-zinc-900 p-1">
        <button
          class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors"
          :class="mode === 'pitwall' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'"
          @click="setMode('pitwall')"
        >
          <UIcon name="i-f1-ai" class="size-3.5" />
          Pitwall
        </button>
        <button
          class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors"
          :class="mode === 'admin' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'"
          @click="setMode('admin')"
        >
          <UIcon name="i-lucide-shield" class="size-3.5" />
          Admin
        </button>
      </div>

      <UChatMessages
        v-if="activeChat.messages.length"
        should-auto-scroll
        :messages="activeChat.messages"
        :status="activeChat.status"
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
            <MDC
              v-else-if="isTextUIPart(part) && part.text.length > 0"
              :value="part.text"
              :cache-key="`${message.id}-${index}`"
              class="*:first:mt-0 *:last:mb-0"
            />
          </template>
        </template>
      </UChatMessages>

      <div v-else class="flex flex-col gap-3">
        <p class="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
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
    </div>

    <template #footer>
      <UChatPrompt
        v-model="input"
        :error="activeChat.error"
        :placeholder
        variant="naked"
        size="sm"
        autofocus
        :ui="{ base: 'px-0' }"
        class="px-4"
        @submit="onSubmit"
      >
        <template #footer>
          <div class="flex items-center gap-1.5 text-xs text-zinc-500">
            <span v-if="mode === 'admin'" class="inline-flex items-center gap-1">
              <UIcon name="i-lucide-shield" class="size-3" />
              Admin only
            </span>
            <span v-else class="inline-flex items-center gap-1">
              <UIcon name="i-f1-ai" class="size-3" />
              Pitwall
            </span>
          </div>
          <UChatPromptSubmit
            size="sm"
            :status="activeChat.status"
            :disabled="!input.trim()"
            @stop="activeChat.stop()"
            @reload="activeChat.regenerate()"
          />
        </template>
      </UChatPrompt>
    </template>
  </USidebar>
</template>

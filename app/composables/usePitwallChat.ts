export type PitwallMode = 'pitwall' | 'admin'

const open = ref(false)
const mode = ref<PitwallMode>('pitwall')

export function usePitwallChat() {
  function toggle() {
    open.value = !open.value
  }

  function setMode(m: PitwallMode) {
    mode.value = m
  }

  return { open, mode, toggle, setMode }
}

const open = ref(false)

export function useAdminChat() {
  function toggle() {
    open.value = !open.value
  }

  return { open, toggle }
}

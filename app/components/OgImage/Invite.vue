<script setup lang="ts">
defineProps<{
  leagueName: string
}>()
</script>

<template>
  <div
    :style="{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      backgroundColor: '#0a0a0a',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      position: 'relative',
    }"
  >
    <div
      :style="{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '28px',
      }"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 30"
        fill="#E10600"
        :style="{ width: '180px', height: '45px' }"
      >
        <path d="M101.087 30h.625v-2.893h.01L102.762 30h.54l1.04-2.893h.01V30h.625v-3.749h-.914l-1.008 2.935h-.01l-1.034-2.935h-.924V30zm-3.46-3.182h1.187V30h.656v-3.182h1.192v-.567h-3.034v.567zM90 30l30-30H101.944L71.944 30H90zm-4.301-16.935H49.382c-11.068 0-13.005.587-17.746 5.327C27.202 22.826 20 30 20 30h15.732l3.753-3.753c2.468-2.468 3.74-2.723 8.921-2.723h26.834l10.458-10.459zM31.152 16.253C27.877 19.343 20.753 26.263 16.913 30H0s13.552-13.513 21.085-20.928C28.846 1.685 32.714 0 46.949 0h51.815L87.545 11.219H48.001c-10.002 0-12.249.693-16.849 5.034z" />
      </svg>

      <div
        :style="{
          width: '2px',
          height: '36px',
          backgroundColor: '#3f3f46',
        }"
      />

      <span
        :style="{
          fontSize: '36px',
          fontWeight: '300',
          color: '#d4d4d8',
          letterSpacing: '0.02em',
        }"
      >
        League
      </span>
    </div>

    <div
      :style="{
        marginTop: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }"
    >
      <span
        :style="{
          fontSize: '13px',
          fontWeight: '700',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#71717a',
        }"
      >
        You're invited to join
      </span>

      <span
        :style="{
          fontSize: '52px',
          fontWeight: '900',
          lineHeight: '1.1',
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          textAlign: 'center',
          maxWidth: '900px',
          color: 'white',
        }"
      >
        {{ leagueName }}
      </span>
    </div>
  </div>
</template>

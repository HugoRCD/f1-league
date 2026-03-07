<script setup lang="ts">
import {
  Tailwind, Container, Text, Preview, Heading, Button,
  Html, Body, Section, Head, Hr, Font,
} from '@vue-email/components'

defineProps({
  name: { type: String, required: true },
  raceName: { type: String, required: true },
  raceLocation: { type: String, required: true },
  lockTime: { type: String, required: true },
  appUrl: { type: String, required: true },
})
</script>

<template>
  <Tailwind>
    <Html>
      <Head>
        <Font
          font-family="Geist"
          fallback-font-family="Helvetica"
          :web-font="{ url: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap', format: 'woff2' }"
          font-weight="400 500 600"
          font-style="normal"
        />
      </Head>
      <Preview>Don't forget to predict the {{ raceName }} Top 10!</Preview>
      <Body class="m-0 p-0 font-sans" style="background-color: #010101;">
        <Container class="mx-auto my-10 max-w-[480px] px-6">
          <Section class="pt-10 pb-8">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg"
              alt="F1 League"
              width="60"
              height="15"
              style="width: 60px; height: 15px; display: block;"
            >
          </Section>

          <Section>
            <Heading class="text-xl font-medium m-0 mb-3" style="color: #ffffff; letter-spacing: -0.3px;">
              Time to predict!
            </Heading>

            <Text class="text-sm m-0 mb-2 leading-relaxed" style="color: rgba(255, 255, 255, 0.6);">
              Hi <span style="color: #ffffff;">{{ name }}</span>,
            </Text>

            <Text class="text-sm m-0 mb-2 leading-relaxed" style="color: rgba(255, 255, 255, 0.6);">
              The <span style="color: #ffffff;">{{ raceName }}</span> in <span style="color: #ffffff;">{{ raceLocation }}</span> is coming up and you haven't submitted your Top 10 prediction yet.
            </Text>

            <Text class="text-sm m-0 mb-6 leading-relaxed" style="color: rgba(255, 255, 255, 0.6);">
              Predictions lock at <span style="color: #ffffff;">{{ lockTime }}</span>.
            </Text>

            <Button
              :href="appUrl"
              class="inline-block rounded-md px-5 py-2.5 text-sm font-medium no-underline"
              style="background-color: #ffffff; color: #010101;"
            >
              Make your prediction
            </Button>
          </Section>

          <Hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 32px 0;" />

          <Section class="pb-8">
            <Text class="text-xs m-0" style="color: rgba(255, 255, 255, 0.3);">
              You can disable reminders in your F1 League settings.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>

<script setup lang="ts">
import {
  Tailwind, Container, Text, Preview, Heading, Button,
  Html, Body, Section, Head, Hr, Font,
} from '@vue-email/components'

defineProps({
  otp: { type: String, required: true },
  magicLink: { type: String, default: '' },
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
        <Font
          font-family="Geist Mono"
          fallback-font-family="monospace"
          :web-font="{ url: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@500&display=swap', format: 'woff2' }"
          font-weight="500"
          font-style="normal"
        />
      </Head>
      <Preview>Your F1 League login code: {{ otp }}</Preview>
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
              Your login code
            </Heading>

            <Text class="text-sm m-0 mb-6 leading-relaxed" style="color: rgba(255, 255, 255, 0.6);">
              Enter this code to sign in to F1 League, or click the button below:
            </Text>

            <Text
              class="text-3xl font-medium m-0 mb-2"
              style="color: #ffffff; font-family: 'Geist Mono', monospace; letter-spacing: 6px;"
            >
              {{ otp }}
            </Text>

            <Text class="text-xs m-0 mb-8" style="color: rgba(255, 255, 255, 0.4);">
              Expires in 10 minutes
            </Text>

            <Button
              v-if="magicLink"
              :href="magicLink"
              class="inline-block rounded-md px-5 py-2.5 text-sm font-medium no-underline"
              style="background-color: #ffffff; color: #010101;"
            >
              Sign in automatically
            </Button>
          </Section>

          <Hr v-if="magicLink" style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 32px 0;" />

          <Section class="pb-8">
            <Text class="text-xs m-0" style="color: rgba(255, 255, 255, 0.3);">
              If you didn't request this code, you can ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>

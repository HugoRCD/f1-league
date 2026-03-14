<script setup lang="ts">
import {
  Tailwind, Container, Text, Preview, Heading, Button,
  Html, Body, Section, Head, Hr, Font,
} from '@vue-email/components'

defineProps({
  name: { type: String, required: true },
  url: { type: String, required: true },
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
      <Preview>Reset your F1 League password</Preview>
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
              Reset your password
            </Heading>

            <Text class="text-sm m-0 mb-6 leading-relaxed" style="color: rgba(255, 255, 255, 0.6);">
              Hi {{ name }}, we received a request to reset your password. Click the button below to choose a new one:
            </Text>

            <Button
              :href="url"
              class="inline-block rounded-md px-6 py-3 text-sm font-semibold no-underline"
              style="background-color: #E10600; color: #ffffff;"
            >
              Reset password →
            </Button>

            <Text class="text-xs m-0 mt-6" style="color: rgba(255, 255, 255, 0.4);">
              This link expires in 1 hour.
            </Text>
          </Section>

          <Hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 32px 0;" />

          <Section class="pb-8">
            <Text class="text-xs m-0" style="color: rgba(255, 255, 255, 0.3);">
              If you didn't request a password reset, you can ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
</template>

![F1 League Banner](public/banner.png)

# F1 League

Predict the F1 Top 10 for every Grand Prix, create leagues, invite whoever you want, and fight for the top of the leaderboard across the full season.

> [f1.hrcd.fr](https://f1.hrcd.fr)

## How it works

1. Create a league and share the invite code
2. Before each Grand Prix, predict the Top 10 finishing order (drag-and-drop)
3. Points are scored based on how close you are — exact position, off by one, in the Top 10, etc.
4. Leaderboard tracks standings across the full season with race wins and exact hits

Predictions lock automatically before race start. Results are imported from the Ergast API, scoring is computed, leaderboards update — everything runs on its own.

## Features

- **Leagues** — create leagues with custom scoring rules, invite people via code, export data
- **Predictions** — drag-and-drop your Top 10 before each race, configurable lock window
- **Leaderboards** — season standings and per-race breakdowns
- **Pitwall** — an AI agent (Gemini) that joins your league, submits predictions, and answers F1 questions through a chat interface
- **Live F1 data** — race calendar with countdowns, driver/team standings, auto-imported results, news feed
- **Email reminders** — get notified before predictions close
- **Admin panel** — manage users, drivers, teams, races, results, scoring rules, seed season data

## Tech stack

- [Nuxt 4](https://nuxt.com) + [Nuxt UI](https://ui.nuxt.com)
- [NuxtHub](https://hub.nuxt.com) — PostgreSQL (Drizzle ORM), KV, Cache
- [Better Auth](https://better-auth.com) — email OTP via [@onmax/nuxt-better-auth](https://github.com/onmax/nuxt-better-auth)
- [Vercel AI SDK](https://ai-sdk.dev) + [Gemini](https://ai.google.dev) — Pitwall AI
- [Resend](https://resend.com) — transactional emails
- [evlog](https://evlog.dev) — structured logging

## Getting started

```bash
pnpm install
cp .env.example .env
openssl rand -base64 32 # generate an auth secret, add it to .env
pnpm dev
```

First user to register becomes admin. Head to `/admin` to seed the 2026 season.

### Database

```bash
pnpm db:generate
pnpm db:migrate
```

## Contributing

Contributions are welcome — feel free to open an issue or submit a PR. Check the [open issues](https://github.com/HugoRCD/f1-championship/issues) to see what's going on.

## License

[Apache 2.0](./LICENSE)

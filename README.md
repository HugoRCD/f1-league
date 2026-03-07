![F1 League Banner](public/banner.png)

# F1 League

A web app where friends predict the F1 Top 10 before each race, points are calculated based on positional accuracy, race winners and season standings are tracked, and predictions lock automatically before race start.

## Features

- **Predict Top 10**: Submit your predicted finishing order for each Grand Prix
- **Automatic scoring**: Points based on positional accuracy (5 for exact, 3 for off-by-1, 2 for off-by-2, 1 for in Top 10)
- **Season leaderboard**: Cumulative standings with race wins and exact hit tracking
- **Prediction window**: Predictions open X days before and lock Y minutes before race start
- **Admin panel**: Manage users, drivers, races, results, scoring rules, and run simulations
- **2026 season data**: Full seed with 11 teams, 22 drivers, and 24 races

## Tech Stack

- [Nuxt 4](https://nuxt.com) + [Nuxt UI](https://ui.nuxt.com)
- [NuxtHub](https://hub.nuxt.com) (PostgreSQL via Drizzle ORM, KV, Cache)
- [Better Auth](https://better-auth.com) via [@onmax/nuxt-better-auth](https://github.com/onmax/nuxt-better-auth)
- [evlog](https://evlog.dev) for structured logging

## Setup

```bash
pnpm install
```

Copy the environment file and set your auth secret:

```bash
cp .env.example .env
```

Generate a secret:

```bash
openssl rand -base64 32
```

## Development

```bash
pnpm dev
```

The first user to register becomes admin automatically. Go to `/admin` to seed the 2026 season data.

## Database

Generate and apply migrations:

```bash
pnpm nuxt db generate
pnpm nuxt db migrate
```

## License

[Apache 2.0](./LICENSE)

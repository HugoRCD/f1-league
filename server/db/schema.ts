import { relations } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

const authUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})

export const team = pgTable('team', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#666666'),
})

export const driver = pgTable('driver', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  firstName: text('firstName').notNull(),
  lastName: text('lastName').notNull(),
  number: integer('number').notNull().unique(),
  teamId: text('teamId').notNull().references(() => team.id, { onDelete: 'cascade' }),
  active: boolean('active').notNull().default(true),
}, table => [index('driver_teamId_idx').on(table.teamId)])

export const race = pgTable('race', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  location: text('location').notNull(),
  startAt: timestamp('startAt', { withTimezone: true }).notNull(),
  season: integer('season').notNull(),
}, table => [
  index('race_season_idx').on(table.season),
  unique('race_name_season_unique').on(table.name, table.season),
])

export const prediction = pgTable('prediction', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('userId').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  raceId: text('raceId').notNull().references(() => race.id, { onDelete: 'cascade' }),
  positions: jsonb('positions').notNull().$type<string[]>(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().$onUpdate(() => new Date()).notNull(),
}, table => [
  unique('prediction_userId_raceId_unique').on(table.userId, table.raceId),
  index('prediction_raceId_idx').on(table.raceId),
  index('prediction_userId_idx').on(table.userId),
])

export const raceResult = pgTable('raceResult', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  raceId: text('raceId').notNull().references(() => race.id, { onDelete: 'cascade' }).unique(),
  positions: jsonb('positions').notNull().$type<string[]>(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().$onUpdate(() => new Date()).notNull(),
})

export const teamRelations = relations(team, ({ many }) => ({
  drivers: many(driver),
}))

export const driverRelations = relations(driver, ({ one }) => ({
  team: one(team, { fields: [driver.teamId], references: [team.id] }),
}))

export const raceRelations = relations(race, ({ many, one }) => ({
  predictions: many(prediction),
  result: one(raceResult, { fields: [race.id], references: [raceResult.raceId] }),
}))

export const predictionRelations = relations(prediction, ({ one }) => ({
  user: one(authUser, { fields: [prediction.userId], references: [authUser.id] }),
  race: one(race, { fields: [prediction.raceId], references: [race.id] }),
}))

export const raceResultRelations = relations(raceResult, ({ one }) => ({
  race: one(race, { fields: [raceResult.raceId], references: [race.id] }),
}))

import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

const PITWALL_ID = 'pitwall'
const PITWALL_NAME = 'Pitwall'

export async function getPitwallUser() {
  const [existing] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, PITWALL_ID))
    .limit(1)

  if (existing) return existing

  const [created] = await db
    .insert(schema.user)
    .values({
      id: PITWALL_ID,
      name: PITWALL_NAME,
      email: 'pitwall@bot',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'user',
      image: null,
    })
    .onConflictDoNothing()
    .returning()

  return created ?? (await db.select().from(schema.user).where(eq(schema.user.id, PITWALL_ID)).limit(1))[0]
}

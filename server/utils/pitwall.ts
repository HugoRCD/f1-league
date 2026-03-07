import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

const PITWALL_ID = 'pitwall'
const PITWALL_NAME = 'Pitwall'
const PITWALL_IMAGE = '/pitwall-icon.png'

export async function getPitwallUser() {
  const [existing] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, PITWALL_ID))
    .limit(1)

  if (existing) {
    if (!existing.image) {
      await db.update(schema.user).set({ image: PITWALL_IMAGE }).where(eq(schema.user.id, PITWALL_ID))
      existing.image = PITWALL_IMAGE
    }
    return existing
  }

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
      image: PITWALL_IMAGE,
    })
    .onConflictDoNothing()
    .returning()

  return created ?? (await db.select().from(schema.user).where(eq(schema.user.id, PITWALL_ID)).limit(1))[0]
}

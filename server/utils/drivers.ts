export function normalizeDriverName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-z]/g, '')
}

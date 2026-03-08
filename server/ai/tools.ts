import { tool } from 'ai'
import { z } from 'zod'

export const getStartingGrid = tool({
  description: 'Get the qualifying/starting grid for a specific race round. Returns driver positions, names, teams, and lap times.',
  inputSchema: z.object({
    round: z.number().describe('Race round number (1-24)'),
  }),
  execute: async ({ round }) => {
    const data = await $fetch<any[]>(`/api/f1/qualifying/${round}`).catch(() => [])
    return data.length > 0
      ? data.map(d => `P${d.position}: ${d.driverName} (${d.driverCode}, ${d.teamName})${d.q3 ? ` - ${d.q3}` : ''}`).join('\n')
      : 'No qualifying data available for this round yet.'
  },
})

export const getDriverStandings = tool({
  description: 'Get the current F1 driver championship standings with points, wins, and team info.',
  inputSchema: z.object({}),
  execute: async () => {
    const data = await $fetch<any[]>('/api/f1/standings/drivers').catch(() => [])
    return data.length > 0
      ? data.map(d => `${d.position}. ${d.driverName} (${d.teamId}) - ${d.points}pts, ${d.wins}W`).join('\n')
      : 'No standings data available.'
  },
})

export const getTeamStandings = tool({
  description: 'Get the current F1 constructor/team championship standings.',
  inputSchema: z.object({}),
  execute: async () => {
    const data = await $fetch<any[]>('/api/f1/standings/teams').catch(() => [])
    return data.length > 0
      ? data.map(d => `${d.position}. ${d.teamName} - ${d.points}pts`).join('\n')
      : 'No team standings data available.'
  },
})

export const getRaceResult = tool({
  description: 'Get the official race result for a specific round. Only available after the race has finished.',
  inputSchema: z.object({
    round: z.number().describe('Race round number (1-24)'),
  }),
  execute: async ({ round }) => {
    const data = await $fetch<any[]>(`/api/f1/race/${round}`).catch(() => [])
    return data.length > 0
      ? data.map(d => `P${d.position}: ${d.driverName} (${d.teamName}) - ${d.status}${d.time ? `, ${d.time}` : ''}`).join('\n')
      : 'No race result available for this round yet.'
  },
})

export const getRaceCalendar = tool({
  description: 'Get the full race calendar for the current season with dates, locations, and status.',
  inputSchema: z.object({}),
  execute: async () => {
    const races = await $fetch<any[]>('/api/races').catch(() => [])
    return races.length > 0
      ? races.map((r: any, i: number) => `R${i + 1}: ${r.name} - ${r.location} (${new Date(r.startAt).toLocaleDateString()}) [${r.hasResult ? 'Result' : r.locked ? 'Locked' : r.open ? 'Open' : 'Upcoming'}]`).join('\n')
      : 'No race calendar available.'
  },
})

export const getLatestNews = tool({
  description: 'Get the latest F1 news headlines from Motorsport.com.',
  inputSchema: z.object({}),
  execute: async () => {
    const news = await $fetch<any[]>('/api/f1/news').catch(() => [])
    return news.length > 0
      ? news.slice(0, 5).map(n => `- ${n.title} (${n.date ? new Date(n.date).toLocaleDateString() : 'recent'})`).join('\n')
      : 'No news available.'
  },
})

export const getAvailableDrivers = tool({
  description: 'Get the list of all active drivers in the league with their team and number.',
  inputSchema: z.object({}),
  execute: async () => {
    const drivers = await $fetch<any[]>('/api/drivers').catch(() => [])
    return drivers.filter((d: any) => d.active)
      .map((d: any) => `#${d.number} ${d.firstName} ${d.lastName} (${d.teamName})`)
      .join('\n')
  },
})

export const getLeagueStandings = tool({
  description: 'Get the prediction league standings for a specific league, showing player points, race wins, and exact predictions.',
  inputSchema: z.object({
    leagueId: z.string().describe('The league ID to get standings for'),
  }),
  execute: async ({ leagueId }) => {
    const standings = await $fetch<any[]>(`/api/leagues/${leagueId}/leaderboard`).catch(() => [])
    return standings.length > 0
      ? standings.map((s: any, i: number) => `${i + 1}. ${s.userName} - ${s.totalPoints}pts, ${s.raceWins}W, ${s.totalExactHits} exact`).join('\n')
      : 'No league standings yet. The season hasn\'t started or no results have been entered.'
  },
})

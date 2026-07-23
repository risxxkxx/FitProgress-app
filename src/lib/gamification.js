// Гејмификација — сериja (streak), XP/ниво и беџови.
// Сè се пресметува клиентски од постоечките табели (vezbi, obroci, merki, voda),
// без потреба од нови табели во базата.

const XP_PER_VEZBA = 15
const XP_PER_OBROK = 5
const XP_PER_MERKA = 10
const XP_PER_VODA_GOAL = 5
const XP_PER_LEVEL = 200

export function computeStreak(workoutDates) {
  // workoutDates: низа од уникатни датуми (YYYY-MM-DD) на тренинзи, било кој редослед
  const set = new Set(workoutDates)
  if (set.size === 0) return 0

  const toISO = d => d.toISOString().slice(0, 10)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Серијата смее да почнува од денес или вчера (за да не се "скрши" пред да тренира денес)
  let cursor = new Date(today)
  if (!set.has(toISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!set.has(toISO(cursor))) return 0
  }

  let streak = 0
  while (set.has(toISO(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function computeXP({ totalVezbi = 0, totalObroci = 0, totalMerki = 0, waterDaysMet = 0 }) {
  return (
    totalVezbi * XP_PER_VEZBA +
    totalObroci * XP_PER_OBROK +
    totalMerki * XP_PER_MERKA +
    waterDaysMet * XP_PER_VODA_GOAL
  )
}

export function levelInfo(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  const intoLevel = xp % XP_PER_LEVEL
  return { level, intoLevel, xpForNext: XP_PER_LEVEL, pct: Math.round((intoLevel / XP_PER_LEVEL) * 100) }
}

export const BADGES = [
  { id: 'streak3', icon: '🔥', mk: '3 дена по ред', en: '3-day streak', check: s => s.streak >= 3 },
  { id: 'streak7', icon: '🔥', mk: '7 дена по ред', en: '7-day streak', check: s => s.streak >= 7 },
  { id: 'streak30', icon: '🌋', mk: '30 дена по ред', en: '30-day streak', check: s => s.streak >= 30 },
  { id: 'v10', icon: '💪', mk: '10 тренинзи', en: '10 workouts', check: s => s.totalVezbi >= 10 },
  { id: 'v50', icon: '🏋️', mk: '50 тренинзи', en: '50 workouts', check: s => s.totalVezbi >= 50 },
  { id: 'v100', icon: '🏆', mk: '100 тренинзи', en: '100 workouts', check: s => s.totalVezbi >= 100 },
  { id: 'o20', icon: '🥗', mk: '20 оброци', en: '20 meals logged', check: s => s.totalObroci >= 20 },
  { id: 'o100', icon: '🍽', mk: '100 оброци', en: '100 meals logged', check: s => s.totalObroci >= 100 },
  { id: 'm5', icon: '📏', mk: '5 мерења', en: '5 measurements', check: s => s.totalMerki >= 5 },
  { id: 'water7', icon: '💧', mk: '7 дена цел вода', en: '7 water goals hit', check: s => s.waterDaysMet >= 7 },
]

export function computeBadges(stats) {
  return BADGES.map(b => ({ ...b, unlocked: b.check(stats) }))
}

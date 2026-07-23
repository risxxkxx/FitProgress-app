import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import { computeStreak, computeXP, levelInfo, computeBadges } from '../lib/gamification'

export default function GamificationCard({ user }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ streak: 0, totalVezbi: 0, totalObroci: 0, totalMerki: 0, waterDaysMet: 0 })

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const [{ data: vezbiDates }, { count: totalVezbi }, { count: totalObroci }, { count: totalMerki }, { data: vodaRows }] = await Promise.all([
      supabase.from('vezbi').select('datum').eq('user_id', user.id).order('datum', { ascending: false }).limit(90),
      supabase.from('vezbi').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('obroci').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('merki').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('voda').select('chasi').eq('user_id', user.id),
    ])

    const { data: goalsRow } = await supabase.from('goals').select('water_goal').eq('user_id', user.id).maybeSingle()
    const waterGoal = goalsRow?.water_goal || 10
    const waterDaysMet = (vodaRows || []).filter(r => (r.chasi || 0) >= waterGoal).length

    setStats({
      streak: computeStreak((vezbiDates || []).map(v => v.datum)),
      totalVezbi: totalVezbi || 0,
      totalObroci: totalObroci || 0,
      totalMerki: totalMerki || 0,
      waterDaysMet,
    })
    setLoading(false)
  }

  if (loading) return null

  const xp = computeXP(stats)
  const { level, intoLevel, xpForNext, pct } = levelInfo(xp)
  const badges = computeBadges(stats)
  const unlockedCount = badges.filter(b => b.unlocked).length

  return (
    <div className="card">
      <div className="gami-header">
        <div className="gami-streak">
          <span style={{ fontSize: 28 }}>🔥</span>
          <div>
            <div className="gami-streak-num">{stats.streak}</div>
            <div className="gami-streak-label">{isEn ? 'day streak' : 'дена по ред'}</div>
          </div>
        </div>
        <div className="gami-level">
          <div className="gami-level-num">{isEn ? 'Level' : 'Ниво'} {level}</div>
          <div className="gami-streak-label">{unlockedCount}/{badges.length} {isEn ? 'badges' : 'беџови'}</div>
        </div>
      </div>

      <div className="gami-xp-track"><div className="gami-xp-fill" style={{ width: pct + '%' }} /></div>
      <div className="gami-xp-label">{intoLevel} / {xpForNext} XP</div>

      <div className="badges-grid">
        {badges.map(b => (
          <div key={b.id} className={`badge-item ${b.unlocked ? '' : 'locked'}`} title={isEn ? b.en : b.mk}>
            <span className="badge-icon">{b.icon}</span>
            <span className="badge-name">{isEn ? b.en : b.mk}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import { cleanText } from '../lib/validation'


export default function LeaderboardPage({ user }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [visible, setVisible] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('treninzi')
  const [error, setError] = useState('')

  const t = {
    title: isEn ? 'Leaderboard' : 'Споредување',
    subtitle: isEn ? 'Compare progress with friends' : 'Споредувај се со пријатели',
    settings: isEn ? 'My settings' : 'Мои поставки',
    showMe: isEn ? 'Show me on the list' : 'Прикажи ме на листата',
    publicNote: isEn ? 'Other users will see only your public display name and workout counts' : 'Другите корисници ќе гледаат само јавен прекар и број на тренинзи',
    nickname: isEn ? 'Nickname (public)' : 'Прекар (јавно прикажано)',
    nickPh: isEn ? 'e.g. MarkoFitness' : 'пр. МаркоФитнес',
    saving: isEn ? 'Saving...' : 'Зачувување...',
    save: isEn ? 'Save' : 'Зачувај',
    list: isEn ? 'List' : 'Листа',
    thisWeek: isEn ? 'This week' : 'Оваа нед.',
    total: isEn ? 'Total' : 'Вкупно',
    loading: isEn ? 'Loading...' : 'Вчитување...',
    empty1: isEn ? 'No users on the list yet.' : 'Нема корисници на листата уште.',
    empty2: isEn ? 'Join and invite friends!' : 'Вклучи се и покани пријатели!',
    anonymous: isEn ? 'Anonymous' : 'Анонимен',
    you: isEn ? 'You' : 'Ти',
    workoutsThisWeek: isEn ? 'workouts this week' : 'тренинзи оваа недела',
    workoutsTotal: isEn ? 'workouts total' : 'тренинзи вкупно',
    nickError: isEn ? 'Nickname must have 2 to 20 real characters.' : 'Прекарот мора да има од 2 до 20 реални карактери.',
  }

  useEffect(() => { loadPrefs(); loadLeaderboard() }, [])

  async function loadPrefs() {
    const { data } = await supabase.from('leaderboard_prefs').select('*').eq('user_id', user.id).maybeSingle()
    if (data) { setVisible(Boolean(data.visible)); setDisplayName(data.display_name || '') }
  }

  async function loadLeaderboard() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_public_leaderboard')

    if (error) {
      console.warn('Leaderboard RPC missing or blocked:', error.message)
      setLeaderboard([])
      setLoading(false)
      return
    }

    const board = (data || []).map(row => ({
      user_id: row.user_id,
      name: cleanText(row.display_name, 20) || t.anonymous,
      weekTreninzi: row.week_treninzi || 0,
      totalTreninzi: row.total_treninzi || 0,
      isMe: row.user_id === user.id,
    }))

    setLeaderboard(board.sort((a, b) => b.weekTreninzi - a.weekTreninzi))
    setLoading(false)
  }

  async function savePrefs() {
    setError('')
    const cleanName = cleanText(displayName, 20)
    if (visible && cleanName.length < 2) {
      setError(t.nickError)
      return
    }
    setSaving(true)
    const { error } = await supabase.from('leaderboard_prefs').upsert({ user_id: user.id, visible, display_name: visible ? cleanName : null }, { onConflict: 'user_id' })
    if (error) setError(error.message)
    else loadLeaderboard()
    setSaving(false)
  }

  const sorted = tab === 'treninzi'
    ? [...leaderboard].sort((a, b) => b.weekTreninzi - a.weekTreninzi)
    : [...leaderboard].sort((a, b) => b.totalTreninzi - a.totalTreninzi)

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t.title}</h1>
        <p className="muted">{t.subtitle}</p>
      </div>

      <div className="card">
        <div className="card-title">{t.settings}</div>
        <div className="supl-row" onClick={() => setVisible(v => !v)} style={{ cursor: 'pointer' }}>
          <div className={`check-box ${visible ? 'checked' : ''}`}>{visible ? '✓' : ''}</div>
          <div>
            <div className="supl-label">{t.showMe}</div>
            <div className="supl-sub">{t.publicNote}</div>
          </div>
        </div>
        {visible && (
          <div className="field" style={{ marginTop: '12px' }}>
            <label>{t.nickname}</label>
            <input type="text" placeholder={t.nickPh} value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={20} />
          </div>
        )}
        {error && <p className="auth-error" style={{ marginTop: 10 }}>{error}</p>}
        <button className="btn-primary" onClick={savePrefs} disabled={saving} style={{ marginTop: '8px' }}>
          {saving ? t.saving : t.save}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{t.list}</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className={`tab-pill ${tab === 'treninzi' ? 'active' : ''}`} onClick={() => setTab('treninzi')}>{t.thisWeek}</button>
            <button className={`tab-pill ${tab === 'total' ? 'active' : ''}`} onClick={() => setTab('total')}>{t.total}</button>
          </div>
        </div>

        {loading && <p className="muted center">{t.loading}</p>}

        {!loading && sorted.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏆</div>
            <p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center' }}>
              {t.empty1}<br />{t.empty2}
            </p>
          </div>
        )}

        {sorted.map((u, i) => (
          <div key={u.user_id} className={`lb-row ${u.isMe ? 'lb-me' : ''}`}>
            <div className="lb-rank">{medals[i] || `#${i+1}`}</div>
            <div className="lb-main">
              <div className="lb-name">{u.name} {u.isMe && <span className="badge-green" style={{ fontSize: '10px' }}>{t.you}</span>}</div>
              <div className="lb-meta">
                {tab === 'treninzi'
                  ? `${u.weekTreninzi} ${t.workoutsThisWeek}`
                  : `${u.totalTreninzi} ${t.workoutsTotal}`
                }
              </div>
            </div>
            <div className="lb-score">{tab === 'treninzi' ? u.weekTreninzi : u.totalTreninzi}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import Insights from '../components/Insights'
import GamificationCard from '../components/GamificationCard'
import { LIMITS, isInRange, clampNumber, cleanText } from '../lib/validation'

const DENOVI = ['pon', 'vto', 'sre', 'cet', 'pet', 'sab', 'ned']
const DENOVI_LABELS = {
  mk: ['Пон', 'Вто', 'Сре', 'Чет', 'Пет', 'Саб', 'Нед'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}
const PLAN_OPCII = {
  mk: ['—', '🏃 Трчање', '💪 SW-A', '💪 SW-B', '🏋️ Тегови', '🚴 Велосипед', '🧘 Истегнување', '⚽ Спорт'],
  en: ['—', '🏃 Running', '💪 SW-A', '💪 SW-B', '🏋️ Weights', '🚴 Cycling', '🧘 Stretching', '⚽ Sport'],
}
const DEFAULT_PLAN = { pon: '🏃 Трчање', vto: '—', sre: '💪 SW-A', cet: '—', pet: '💪 SW-B', sab: '—', ned: '—' }
const VREME_OPCII = {
  mk: ['Наутро', 'Пред тренинг', 'По тренинг', 'Навечер', 'Со јадење'],
  en: ['Morning', 'Before workout', 'After workout', 'Evening', 'With food'],
}

function localizePlanValue(value, isEn) {
  if (!isEn) return value
  const map = {
    '🏃 Трчање': '🏃 Running',
    '🏋️ Тегови': '🏋️ Weights',
    '🚴 Велосипед': '🚴 Cycling',
    '🧘 Истегнување': '🧘 Stretching',
    '⚽ Спорт': '⚽ Sport',
    'Наутро': 'Morning',
    'Пред тренинг': 'Before workout',
    'По тренинг': 'After workout',
    'Навечер': 'Evening',
    'Со јадење': 'With food',
  }
  return map[value] || value
}

export default function Dashboard({ user, goals }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [stats, setStats] = useState({ treninzi: 0, tezina: null })
  const [water, setWater] = useState(0)
  const [weekPlan, setWeekPlan] = useState(DEFAULT_PLAN)
  const [editPlan, setEditPlan] = useState(false)
  const [tempPlan, setTempPlan] = useState(DEFAULT_PLAN)
  const [savingPlan, setSavingPlan] = useState(false)
  const vodaGoal = Math.round(clampNumber(goals?.water_goal || goals?.waterGoal || 10, LIMITS.waterCups.min, LIMITS.waterCups.max, 10))

  const [suplLista, setSuplLista] = useState([])
  const [suplChecked, setSuplChecked] = useState({})
  const [showAddSupl, setShowAddSupl] = useState(false)
  const [newSuplNaziv, setNewSuplNaziv] = useState('')
  const [newSuplDoza, setNewSuplDoza] = useState('')
  const [newSuplVreme, setNewSuplVreme] = useState(VREME_OPCII[lang][0])
  const [savingSupl, setSavingSupl] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const t = {
    welcome: isEn ? 'Welcome' : 'Добредојде',
    athlete: isEn ? 'Athlete' : 'Атлета',
    lastWeight: isEn ? 'last weight' : 'последна тежина',
    workoutsWeek: isEn ? 'workouts this week' : 'тренинзи оваа нед.',
    cupsWater: isEn ? 'cups of water' : 'чаши вода',
    supplementsToday: isEn ? 'Supplements today' : 'Суплементи денес',
    cancel: isEn ? 'Cancel' : 'Откажи',
    add: isEn ? '+ Add' : '+ Додади',
    name: isEn ? 'Name' : 'Назив',
    doseOptional: isEn ? 'Dose (optional)' : 'Доза (опционално)',
    time: isEn ? 'Time' : 'Време',
    addSupplement: isEn ? 'Add supplement' : 'Додади суплемент',
    noSupplements: isEn ? 'No supplements. Click + Add to add one.' : 'Нема суплементи. Кликни + Додади за да додадеш.',
    waterToday: isEn ? 'Water today' : 'Вода денес',
    today: isEn ? 'Today' : 'Денес',
    goal: isEn ? 'Goal' : 'Цел',
    weeklyPlan: isEn ? 'Weekly plan' : 'Неделен план',
    edit: isEn ? 'Edit' : 'Уреди',
    savePlan: isEn ? 'Save plan' : 'Зачувај план',
    saving: isEn ? 'Saving...' : 'Зачувување...',
  }

  useEffect(() => {
    loadStats()
    loadWater()
    loadSuplLista()
    loadWeekPlan()
  }, [])

  useEffect(() => {
    setNewSuplVreme(VREME_OPCII[lang][0])
  }, [lang])

  async function loadStats() {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const { data: tr } = await supabase.from('vezbi').select('id').eq('user_id', user.id).gte('datum', weekStart.toISOString().slice(0, 10))
    const { data: mk } = await supabase.from('merki').select('tezina').eq('user_id', user.id).order('datum', { ascending: false }).limit(10)
    const latestValidWeight = (mk || []).find(m => isInRange(m.tezina, LIMITS.weight.min, LIMITS.weight.max))
    setStats({ treninzi: tr?.length || 0, tezina: latestValidWeight?.tezina || null })
  }

  async function loadWater() {
    const { data } = await supabase.from('voda').select('chasi').eq('user_id', user.id).eq('datum', today).maybeSingle()
    setWater(Math.round(clampNumber(data?.chasi || 0, 0, LIMITS.waterCups.max, 0)))
  }

  async function loadSuplLista() {
    const { data: lista } = await supabase.from('suplementi_lista').select('*').eq('user_id', user.id).order('created_at')
    setSuplLista(lista || [])

    const { data: dnevni } = await supabase.from('suplementi').select('*').eq('user_id', user.id).eq('datum', today).maybeSingle()
    if (dnevni?.checked) setSuplChecked(dnevni.checked)
  }

  async function loadWeekPlan() {
    const { data, error } = await supabase.from('nedelen_plan').select('*').eq('user_id', user.id).maybeSingle()
    if (error) { console.warn('Could not load weekly plan:', error.message); return }
    if (data) {
      const plan = { pon: data.pon, vto: data.vto, sre: data.sre, cet: data.cet, pet: data.pet, sab: data.sab, ned: data.ned }
      setWeekPlan(plan)
      setTempPlan(plan)
    }
  }

  async function toggleSupl(id) {
    const newChecked = { ...suplChecked, [id]: !suplChecked[id] }
    setSuplChecked(newChecked)
    await supabase.from('suplementi').upsert(
      { user_id: user.id, datum: today, checked: newChecked },
      { onConflict: 'user_id,datum' }
    )
  }

  async function addSupl() {
    const naziv = cleanText(newSuplNaziv, 60)
    const doza = cleanText(newSuplDoza, 80)
    if (!naziv || naziv.length < 2) return
    setSavingSupl(true)
    await supabase.from('suplementi_lista').insert({
      user_id: user.id,
      naziv,
      doza,
      vreme: newSuplVreme
    })
    setNewSuplNaziv('')
    setNewSuplDoza('')
    setNewSuplVreme(VREME_OPCII[lang][0])
    setShowAddSupl(false)
    loadSuplLista()
    setSavingSupl(false)
  }

  async function deleteSupl(id) {
    await supabase.from('suplementi_lista').delete().eq('id', id)
    loadSuplLista()
  }

  async function setWaterCup(n) {
    const safeN = Math.round(clampNumber(n, 1, LIMITS.waterCups.max, 1))
    const newVal = water === safeN ? safeN - 1 : safeN
    setWater(newVal)
    await supabase.from('voda').upsert({ user_id: user.id, datum: today, chasi: newVal }, { onConflict: 'user_id,datum' })
  }

  async function savePlan() {
    setSavingPlan(true)
    await supabase.from('nedelen_plan').upsert({ user_id: user.id, ...tempPlan }, { onConflict: 'user_id' })
    setWeekPlan(tempPlan)
    setEditPlan(false)
    setSavingPlan(false)
  }

  const getTypeClass = (val) => {
    if (val.includes('Трчање') || val.includes('Running')) return 'run'
    if (val.includes('SW') || val.includes('Тегови') || val.includes('Weights')) return 'sw'
    if (val === '—') return 'rest'
    return 'sw'
  }

  const userName = cleanText(user.user_metadata?.full_name || '', 80).split(' ')[0] || t.athlete

  return (
    <div className="page">
      <Insights user={user} />
      <div className="page-header">
        <h1>{t.welcome}, {userName} 👋</h1>
        <p className="muted">{new Date().toLocaleDateString(isEn ? 'en-US' : 'mk-MK', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">{stats.tezina ? `${stats.tezina}kg` : '—'}</div>
          <div className="stat-label">{t.lastWeight}</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{stats.treninzi}</div>
          <div className="stat-label">{t.workoutsWeek}</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{water}/{vodaGoal}</div>
          <div className="stat-label">{t.cupsWater}</div>
        </div>
      </div>

      <GamificationCard user={user} />

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{t.supplementsToday}</div>
          <button className="btn-ghost small" onClick={() => setShowAddSupl(!showAddSupl)}>
            {showAddSupl ? t.cancel : t.add}
          </button>
        </div>

        {showAddSupl && (
          <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
            <div className="field">
              <label>{t.name}</label>
              <input type="text" placeholder="Hydro Whey Zero" maxLength="60" value={newSuplNaziv} onChange={e => setNewSuplNaziv(e.target.value)} />
            </div>
            <div className="field">
              <label>{t.doseOptional}</label>
              <input type="text" placeholder={isEn ? 'e.g. 1 scoop + water' : 'пр. 1 мерка + вода'} maxLength="80" value={newSuplDoza} onChange={e => setNewSuplDoza(e.target.value)} />
            </div>
            <div className="field">
              <label>{t.time}</label>
              <select value={newSuplVreme} onChange={e => setNewSuplVreme(e.target.value)}>
                {VREME_OPCII[lang].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={addSupl} disabled={savingSupl}>
              {savingSupl ? '...' : t.addSupplement}
            </button>
          </div>
        )}

        {suplLista.length === 0 && !showAddSupl && (
          <p className="muted" style={{ fontSize: '13px' }}>{t.noSupplements}</p>
        )}

        {suplLista.map(s => (
          <div key={s.id} className={`supl-row ${suplChecked[s.id] ? 'done' : ''}`}>
            <div
              className={`check-box ${suplChecked[s.id] ? 'checked' : ''}`}
              onClick={() => toggleSupl(s.id)}
            >
              {suplChecked[s.id] ? '✓' : ''}
            </div>
            <div style={{ flex: 1 }} onClick={() => toggleSupl(s.id)}>
              <div className="supl-label">{s.naziv}</div>
              <div className="supl-sub">{localizePlanValue(s.vreme, isEn)}{s.doza ? ` · ${s.doza}` : ''}</div>
            </div>
            <button className="btn-icon danger" onClick={() => deleteSupl(s.id)}>✕</button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">{t.waterToday}</div>
        <div className="water-grid">
          {Array.from({ length: Math.min(LIMITS.waterCups.max, Math.max(water + 2, vodaGoal)) }, (_, i) => (
            <div key={i} className={`water-cup ${i < water ? 'filled' : ''}`} onClick={() => setWaterCup(i + 1)}>💧</div>
          ))}
        </div>
        <p className="muted small">
          {t.today}: <strong style={{ color: 'var(--accent2)' }}>{(water * 0.25).toFixed(2)} L</strong> · {t.goal}: {vodaGoal} {isEn ? 'cups' : 'чаши'} = {(vodaGoal * 0.25).toFixed(1)} L
        </p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{t.weeklyPlan}</div>
          <button className="btn-ghost small" onClick={() => { setTempPlan(weekPlan); setEditPlan(!editPlan) }}>
            {editPlan ? t.cancel : t.edit}
          </button>
        </div>

        {editPlan ? (
          <>
            <div className="plan-edit-grid">
              {DENOVI.map((den, i) => (
                <div key={den} className="plan-edit-row">
                  <span className="plan-edit-label">{DENOVI_LABELS[lang][i]}</span>
                  <select value={tempPlan[den]} onChange={e => setTempPlan({ ...tempPlan, [den]: e.target.value })}>
                    {PLAN_OPCII[lang].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={savePlan} disabled={savingPlan} style={{ marginTop: '12px' }}>
              {savingPlan ? t.saving : t.savePlan}
            </button>
          </>
        ) : (
          <div className="week-grid">
            {DENOVI.map((den, i) => (
              <div key={den} className={`week-day week-${getTypeClass(weekPlan[den])}`}>
                <div className="week-day-name">{DENOVI_LABELS[lang][i]}</div>
                <div className="week-day-type">{localizePlanValue(weekPlan[den], isEn)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

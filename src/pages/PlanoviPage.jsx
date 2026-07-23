import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'

const PLAN_COLORS = {
  gym: '#c8f060',
  home: '#60d4f0',
}

// Распоред на тренинг-денови низ неделата, во зависност од бројот на тренинзи неделно
const WEEK_SLOTS = {
  2: ['pon', 'cet'],
  3: ['pon', 'sre', 'pet'],
  // Пон/Вто/Сре тренинг → Чет одмор → Пет/Саб тренинг → Нед одмор.
  // Макс. 3 последователни тренинг дена наместо 5 право, со одмор распореден низ неделата.
  5: ['pon', 'vto', 'sre', 'pet', 'sab'],
}

// Опциите во падачкото мени за неделниот план на Dashboard (мора да се совпаѓаат точно)
function tipToWeekOption(tip) {
  const t = tip.toLowerCase()
  if (t.includes('cardio') || t.includes('conditioning')) return '🏃 Трчање'
  if (t.includes('mobility') || t.includes('stretch') || t.includes('core')) return '🧘 Истегнување'
  return '🏋️ Тегови'
}

function planToWeekPlan(plan) {
  const slots = WEEK_SLOTS[plan.days] || WEEK_SLOTS[3]
  const week = { pon: '—', vto: '—', sre: '—', cet: '—', pet: '—', sab: '—', ned: '—' }
  plan.denovi.forEach((d, i) => {
    if (slots[i]) week[slots[i]] = tipToWeekOption(d.tip)
  })
  return week
}

const BASE_PLANS = [
  {
    id: 'gym-2-beginner', type: 'gym', days: 2,
    mk: { naziv: 'Почетник — Теретана 2 дена', opis: 'Full body план за почетници, 2 тренинзи неделно.' },
    en: { naziv: 'Beginner — Gym 2 days', opis: 'Full-body beginner plan, 2 workouts per week.' },
    denovi: [
      { den: 'Ден 1', day: 'Day 1', tip: 'Full Body A', vezbi: ['Goblet squat — 3 x 10', 'Machine chest press — 3 x 10', 'Lat pulldown — 3 x 10', 'Romanian deadlift — 3 x 10', 'Seated row — 2 x 12', 'Plank — 3 x 30 sec'] },
      { den: 'Ден 2', day: 'Day 2', tip: 'Full Body B', vezbi: ['Leg press — 3 x 12', 'Dumbbell shoulder press — 3 x 10', 'Cable row — 3 x 10', 'Hip thrust — 3 x 12', 'Hamstring curl — 2 x 12', 'Dead bug — 3 x 10'] },
    ]
  },
  {
    id: 'gym-3-beginner', type: 'gym', days: 3,
    mk: { naziv: 'Почетник — Теретана 3 дена', opis: 'Најбалансиран старт за сила, техника и навика.' },
    en: { naziv: 'Beginner — Gym 3 days', opis: 'Balanced start for strength, technique and consistency.' },
    denovi: [
      { den: 'Ден 1', day: 'Day 1', tip: 'Upper', vezbi: ['Machine chest press — 3 x 10', 'Lat pulldown — 3 x 10', 'Dumbbell shoulder press — 2 x 12', 'Seated row — 3 x 10', 'Triceps pushdown — 2 x 12', 'Biceps curl — 2 x 12'] },
      { den: 'Ден 2', day: 'Day 2', tip: 'Lower', vezbi: ['Leg press — 3 x 12', 'Goblet squat — 3 x 10', 'Romanian deadlift — 3 x 10', 'Leg curl — 2 x 12', 'Calf raises — 3 x 15', 'Plank — 3 x 30 sec'] },
      { den: 'Ден 3', day: 'Day 3', tip: 'Full Body', vezbi: ['Smith machine squat — 3 x 10', 'Incline dumbbell press — 3 x 10', 'Cable row — 3 x 10', 'Hip thrust — 3 x 12', 'Face pulls — 2 x 15', 'Cable crunch — 3 x 12'] },
    ]
  },
  {
    id: 'gym-5-beginner', type: 'gym', days: 5,
    mk: { naziv: 'Почетник — Теретана 5 дена', opis: 'Почетнички split со умерен волумен и повеќе движење.' },
    en: { naziv: 'Beginner — Gym 5 days', opis: 'Beginner split with moderate volume and more weekly movement.' },
    denovi: [
      { den: 'Ден 1', day: 'Day 1', tip: 'Push', vezbi: ['Machine chest press — 3 x 10', 'Incline dumbbell press — 3 x 10', 'Shoulder press — 2 x 12', 'Lateral raises — 2 x 15', 'Triceps pushdown — 2 x 12'] },
      { den: 'Ден 2', day: 'Day 2', tip: 'Pull', vezbi: ['Lat pulldown — 3 x 10', 'Seated cable row — 3 x 10', 'Face pulls — 2 x 15', 'Back extension — 2 x 12', 'Dumbbell curls — 2 x 12'] },
      { den: 'Ден 3', day: 'Day 3', tip: 'Legs', vezbi: ['Leg press — 3 x 12', 'Goblet squat — 3 x 10', 'Romanian deadlift — 3 x 10', 'Leg curl — 2 x 12', 'Calf raises — 3 x 15'] },
      { den: 'Ден 4', day: 'Day 4', tip: 'Conditioning + Core', vezbi: ['Treadmill incline walk — 20 min', 'Plank — 3 x 30 sec', 'Dead bug — 3 x 10', 'Cable crunch — 3 x 12', 'Mobility — 8 min'] },
      { den: 'Ден 5', day: 'Day 5', tip: 'Full Body Light', vezbi: ['Smith squat — 2 x 10', 'Machine row — 2 x 12', 'Dumbbell bench — 2 x 10', 'Hip thrust — 2 x 12', 'Farmer carry — 3 rounds'] },
    ]
  },
  {
    id: 'home-2-beginner', type: 'home', days: 2,
    mk: { naziv: 'Почетник — Дома 2 дена', opis: 'Минимален домашен план без опрема.' },
    en: { naziv: 'Beginner — Home 2 days', opis: 'Minimal home plan with no equipment.' },
    denovi: [
      { den: 'Ден 1', day: 'Day 1', tip: 'Full Body A', vezbi: ['Bodyweight squat — 3 x 12', 'Incline push-ups — 3 x 8', 'Glute bridge — 3 x 12', 'Bird dog — 3 x 10', 'Plank — 3 x 25 sec'] },
      { den: 'Ден 2', day: 'Day 2', tip: 'Full Body B', vezbi: ['Reverse lunges — 3 x 10/leg', 'Wall sit — 3 x 30 sec', 'Backpack row — 3 x 12', 'Hip hinge good morning — 3 x 12', 'Side plank — 2 x 20 sec/side'] },
    ]
  },
  {
    id: 'home-3-beginner', type: 'home', days: 3,
    mk: { naziv: 'Почетник — Дома 3 дена', opis: 'Домашен план за навика, сила и кондиција.' },
    en: { naziv: 'Beginner — Home 3 days', opis: 'Home plan for consistency, strength and conditioning.' },
    denovi: [
      { den: 'Ден 1', day: 'Day 1', tip: 'Strength A', vezbi: ['Squat — 3 x 12', 'Incline push-ups — 3 x 8', 'Backpack row — 3 x 12', 'Glute bridge — 3 x 15', 'Plank — 3 x 30 sec'] },
      { den: 'Ден 2', day: 'Day 2', tip: 'Cardio + Core', vezbi: ['Brisk walk / light jog — 20 min', 'Mountain climbers — 3 x 20', 'Dead bug — 3 x 10', 'Side plank — 2 x 20 sec', 'Stretching — 8 min'] },
      { den: 'Ден 3', day: 'Day 3', tip: 'Strength B', vezbi: ['Reverse lunges — 3 x 10/leg', 'Push-ups — 3 x 6-10', 'Hip thrust on sofa — 3 x 12', 'Backpack deadlift — 3 x 12', 'Hollow hold — 3 x 20 sec'] },
    ]
  },
  {
    id: 'home-5-beginner', type: 'home', days: 5,
    mk: { naziv: 'Почетник — Дома 5 дена', opis: 'Кратки домашни тренинзи за луѓе што сакаат рутина.' },
    en: { naziv: 'Beginner — Home 5 days', opis: 'Short home workouts for people who want a routine.' },
    denovi: [
      { den: 'Ден 1', day: 'Day 1', tip: 'Lower', vezbi: ['Squat — 3 x 12', 'Reverse lunge — 3 x 10/leg', 'Glute bridge — 3 x 15', 'Calf raises — 3 x 15'] },
      { den: 'Ден 2', day: 'Day 2', tip: 'Upper', vezbi: ['Incline push-ups — 3 x 8', 'Backpack row — 3 x 12', 'Shoulder taps — 3 x 20', 'Triceps dips on chair — 2 x 10'] },
      { den: 'Ден 3', day: 'Day 3', tip: 'Cardio', vezbi: ['Brisk walk — 25 min', 'Jumping jacks — 3 x 30 sec', 'High knees — 3 x 30 sec', 'Stretching — 8 min'] },
      { den: 'Ден 4', day: 'Day 4', tip: 'Core + Mobility', vezbi: ['Plank — 3 x 30 sec', 'Dead bug — 3 x 10', 'Bird dog — 3 x 10', 'Mobility flow — 10 min'] },
      { den: 'Ден 5', day: 'Day 5', tip: 'Full Body', vezbi: ['Squat — 2 x 12', 'Push-ups — 2 x 8', 'Backpack row — 2 x 12', 'Hip thrust — 2 x 12', 'Farmer carry with bags — 3 rounds'] },
    ]
  },
]

export default function PlanoviPage({ user, onRequireAccount }) {
  const storageUserId = user?.id
  const isGuest = !user
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [typeFilter, setTypeFilter] = useState('all')
  const [dayFilter, setDayFilter] = useState('all')
  const [activePlanId, setActivePlanId] = useState(() => user ? localStorage.getItem(`active_plan_${storageUserId}`) || null : null)
  const [expanded, setExpanded] = useState(null)
  const [customTitle, setCustomTitle] = useState('')
  const [customExercise, setCustomExercise] = useState('')
  const [draftVezbi, setDraftVezbi] = useState([])
  const [myPlans, setMyPlans] = useState(() => {
    if (!user) return []
    try { return JSON.parse(localStorage.getItem(`custom_plans_${storageUserId}`) || '[]') } catch { return [] }
  })
  const [addExerciseFor, setAddExerciseFor] = useState(null)
  const [addExerciseText, setAddExerciseText] = useState('')

  useEffect(() => {
    if (!user || !storageUserId) return
    localStorage.setItem(`custom_plans_${storageUserId}`, JSON.stringify(myPlans))
  }, [myPlans, storageUserId, user])

  const [planError, setPlanError] = useState('')

  async function activatePlan(planId) {
    setActivePlanId(planId)
    setPlanError('')

    if (isGuest) {
      setPlanError(isEn
        ? 'Demo mode: the plan is only selected for preview and is not saved. Create an account to save progress.'
        : 'Демо режим: планот е само избран за преглед и не се зачувува. Направи акаунт за зачувување прогрес.')
      if (onRequireAccount) onRequireAccount()
      return
    }

    localStorage.setItem(`active_plan_${storageUserId}`, planId)

    const { error: activeError } = await supabase.from('aktiven_plan').upsert({ user_id: user.id, plan_id: planId, started_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (activeError) console.warn('Active plan saved locally only:', activeError)

    const plan = BASE_PLANS.find(p => p.id === planId)
    if (plan) {
      const week = planToWeekPlan(plan)
      const { error: weekError } = await supabase.from('nedelen_plan').upsert({ user_id: user.id, ...week }, { onConflict: 'user_id' })
      if (weekError) {
        setPlanError(isEn
          ? `The plan was activated, but couldn't sync to the Home weekly plan: ${weekError.message}`
          : `Планот е активиран, но не успеа да се одрази во Неделниот план на Дома: ${weekError.message}`)
      }
    }
  }

  async function deactivatePlan() {
    setActivePlanId(null)
    if (!isGuest && storageUserId) localStorage.removeItem(`active_plan_${storageUserId}`)
    if (!isGuest) {
      try { await supabase.from('aktiven_plan').delete().eq('user_id', user.id) } catch { /* игнорирај — веќе е тргнато локално */ }
    }
  }

  function addDraftExercise() {
    if (!customExercise.trim()) return
    setDraftVezbi(prev => [...prev, customExercise.trim()])
    setCustomExercise('')
  }

  function removeDraftExercise(i) {
    setDraftVezbi(prev => prev.filter((_, idx) => idx !== i))
  }

  function saveMyPlan() {
    if (isGuest) {
      setPlanError(isEn
        ? 'Custom plans are not saved in demo mode. Create an account to save your own plan.'
        : 'Сопствените планови не се зачувуваат во демо режим. Направи акаунт за да зачуваш свој план.')
      if (onRequireAccount) onRequireAccount()
      return
    }
    if (draftVezbi.length === 0) return
    const naziv = customTitle.trim() || (isEn ? 'My custom plan' : 'Мој план')
    setMyPlans(prev => [...prev, { id: crypto.randomUUID(), naziv, vezbi: draftVezbi }])
    setCustomTitle('')
    setDraftVezbi([])
  }

  function deleteMyPlan(id) {
    setMyPlans(prev => prev.filter(p => p.id !== id))
  }

  function removeExerciseFromPlan(planId, i) {
    setMyPlans(prev => prev.map(p => p.id === planId ? { ...p, vezbi: p.vezbi.filter((_, idx) => idx !== i) } : p))
  }

  function addExerciseToPlan(planId) {
    if (!addExerciseText.trim()) return
    setMyPlans(prev => prev.map(p => p.id === planId ? { ...p, vezbi: [...p.vezbi, addExerciseText.trim()] } : p))
    setAddExerciseText('')
    setAddExerciseFor(null)
  }

  const plans = useMemo(() => BASE_PLANS.filter(p => {
    const typeOk = typeFilter === 'all' || p.type === typeFilter
    const dayOk = dayFilter === 'all' || p.days === Number(dayFilter)
    return typeOk && dayOk
  }), [typeFilter, dayFilter])

  const t = {
    title: isEn ? 'Training plans' : 'Тренинг планови',
    subtitle: isGuest
      ? (isEn ? 'Preview beginner plans in demo mode. Nothing is saved until you create an account.' : 'Разгледај почетнички планови во демо режим. Ништо не се зачувува додека не направиш акаунт.')
      : (isEn ? 'Beginner plans for gym and home, separated by 2, 3 and 5 days.' : 'Почетнички планови за теретана и дома, одвоени за 2, 3 и 5 дена.'),
    all: isEn ? 'All' : 'Сите', gym: isEn ? 'Gym' : 'Теретана', home: isEn ? 'Home' : 'Дома', days: isEn ? 'days' : 'дена',
    active: isEn ? 'Active plan' : 'Активен план', deactivate: isEn ? 'Deactivate' : 'Деактивирај', details: isEn ? 'Details' : 'Детали', hide: isEn ? 'Hide' : 'Скриј', activate: isEn ? 'Activate plan' : 'Активирај план',
    weekly: isEn ? 'workouts/week' : 'тренинзи неделно', customTitle: isEn ? 'Custom plan builder' : 'Свој план',
    customText: isEn ? 'Give your plan a name, add as many exercises as you like, then save it as one plan.' : 'Дај му име на планот, додади колку сакаш вежби, па зачувај го целиот план одеднаш.',
    planName: isEn ? 'Plan name' : 'Име на план', exercise: isEn ? 'Exercise / note' : 'Вежба / белешка', add: isEn ? 'Add to my plan' : 'Додади во мој план', empty: isEn ? 'No custom exercises yet.' : 'Сè уште нема додадени свои вежби.'
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>{t.title}</h1>
        <p className="muted">{t.subtitle}</p>
      </div>

      <div className="filter-bar">
        {['all', 'gym', 'home'].map(type => <button key={type} className={`tab-pill ${typeFilter === type ? 'active' : ''}`} onClick={() => setTypeFilter(type)}>{t[type]}</button>)}
        {['all', '2', '3', '5'].map(days => <button key={days} className={`tab-pill ${dayFilter === days ? 'active' : ''}`} onClick={() => setDayFilter(days)}>{days === 'all' ? t.all : `${days} ${t.days}`}</button>)}
      </div>

      {planError && <p className="auth-error" style={{ marginBottom: 12 }}>{planError}</p>}

      {activePlanId && (
        <div className="card plan-active-card">
          <div>
            <div className="eyebrow">{t.active}</div>
            <strong>{BASE_PLANS.find(p => p.id === activePlanId)?.[lang]?.naziv || activePlanId}</strong>
            <p className="muted small" style={{ marginTop: 4 }}>{isGuest ? (isEn ? '✓ Selected for preview only, not saved' : '✓ Избрано само за преглед, не се зачувува') : (isEn ? '✓ Synced to your Weekly plan on the Home tab' : '✓ Одразено во Неделен план на Дома')}</p>
          </div>
          <button className="btn-danger-outline" onClick={deactivatePlan}>{t.deactivate}</button>
        </div>
      )}

      <div className="plans-grid">
        {plans.map(plan => {
          const isActive = activePlanId === plan.id
          const isExpanded = expanded === plan.id
          const color = PLAN_COLORS[plan.type]
          return (
            <div key={plan.id} className={`card plan-card ${isActive ? 'plan-active' : ''}`}>
              <div className="plan-card-head">
                <span className="plan-nivo-badge" style={{ color, background: `${color}22` }}>{plan.type === 'gym' ? t.gym : t.home}</span>
                <span className="set-badge">{plan.days} {t.weekly}</span>
              </div>
              <h3 className="plan-title">{plan[lang].naziv}</h3>
              <p className="muted small">{plan[lang].opis}</p>

              <div className="plan-actions">
                <button className="btn-ghost small" onClick={() => setExpanded(isExpanded ? null : plan.id)}>{isExpanded ? t.hide : t.details}</button>
                <button className="btn-primary" onClick={() => activatePlan(plan.id)}>{isActive ? '✓' : t.activate}</button>
              </div>

              {isExpanded && (
                <div className="plan-days">
                  {plan.denovi.map((d, i) => (
                    <div key={i} className="plan-day-block">
                      <div className="history-date">{isEn ? d.day : d.den} — {d.tip}</div>
                      {d.vezbi.map(v => <div key={v} className="plan-exercise">{v}</div>)}
                      <div className="plan-exercise custom-slot">+ {isEn ? 'Add your own exercise here' : 'Додај своја вежба тука'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card custom-plan-card">
        <div className="card-title">{t.customTitle}</div>
        <p className="muted small">{t.customText}</p>

        <div className="field"><input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder={t.planName} /></div>
        <div className="custom-plan-form">
          <input value={customExercise} onChange={e => setCustomExercise(e.target.value)} placeholder={t.exercise} onKeyDown={e => e.key === 'Enter' && addDraftExercise()} />
          <button className="btn-ghost" onClick={addDraftExercise}>{isEn ? '+ Add exercise' : '+ Додади вежба'}</button>
        </div>

        {draftVezbi.length > 0 && (
          <div className="plan-day-block" style={{ marginTop: 10 }}>
            {draftVezbi.map((v, i) => (
              <div key={i} className="plan-exercise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{v}</span>
                <button className="btn-icon danger" onClick={() => removeDraftExercise(i)}>✕</button>
              </div>
            ))}
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={saveMyPlan}>
              {isEn ? `Save plan (${draftVezbi.length} exercises)` : `Зачувај план (${draftVezbi.length} вежби)`}
            </button>
          </div>
        )}

        {myPlans.length === 0 && draftVezbi.length === 0 && <p className="muted center">{t.empty}</p>}

        {myPlans.map(plan => (
          <div key={plan.id} className="plan-day-block" style={{ marginTop: 12 }}>
            <div className="history-date" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{plan.naziv}</span>
              <button className="btn-icon danger" onClick={() => deleteMyPlan(plan.id)}>✕</button>
            </div>
            {plan.vezbi.map((v, i) => (
              <div key={i} className="plan-exercise" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{v}</span>
                <button className="btn-icon danger" onClick={() => removeExerciseFromPlan(plan.id, i)}>✕</button>
              </div>
            ))}
            {addExerciseFor === plan.id ? (
              <div className="custom-plan-form" style={{ marginTop: 8 }}>
                <input value={addExerciseText} onChange={e => setAddExerciseText(e.target.value)} placeholder={t.exercise} onKeyDown={e => e.key === 'Enter' && addExerciseToPlan(plan.id)} autoFocus />
                <button className="btn-primary" onClick={() => addExerciseToPlan(plan.id)}>{t.add}</button>
              </div>
            ) : (
              <button className="btn-ghost small" style={{ marginTop: 8 }} onClick={() => { setAddExerciseFor(plan.id); setAddExerciseText('') }}>
                {isEn ? '+ Add exercise to this plan' : '+ Додади вежба во овој план'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

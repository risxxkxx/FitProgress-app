import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import InstallGuideCard from '../components/InstallGuideCard'
import NotificationsCard from '../components/NotificationsCard'
import { calcDailyTargets, inferGoalFromWeights } from '../lib/fitnessCalc'
import { LIMITS, clampNumber, rangeError, toNumber } from '../lib/validation'

function firstNumber(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value
  }
  return ''
}

function safeNumber(value, min, max, fallback) {
  const n = clampNumber(value, min, max, fallback)
  return Number.isInteger(n) ? n : Math.round(n * 10) / 10
}

export default function SettingsPage({ user, onGoalsUpdate, onResetOnboarding }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [kcalGoal, setKcalGoal] = useState(2000)
  const [protGoal, setProtGoal] = useState(150)
  const [waterGoal, setWaterGoal] = useState(10)
  const [trainGoal, setTrainGoal] = useState(3)
  const [weightStart, setWeightStart] = useState(80)
  const [weightGoal, setWeightGoal] = useState(74)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [profil, setProfil] = useState(null)
  const [recalcNote, setRecalcNote] = useState('')

  useEffect(() => { loadGoals(); loadProfil() }, [])

  async function loadProfil() {
    const { data } = await supabase.from('profili').select('visina, pol, vozrast, aktivnost').eq('user_id', user.id).maybeSingle()
    if (data) setProfil(data)
  }

  async function loadGoals() {
    const { data } = await supabase.from('goals').select('*').eq('user_id', user.id).maybeSingle()
    if (data) {
      setKcalGoal(safeNumber(firstNumber(data.kcal_goal, data.dnevni_kalorii, data.kalorii, 2000), LIMITS.dailyCalories.min, LIMITS.dailyCalories.max, 2000))
      setProtGoal(safeNumber(firstNumber(data.prot_goal, data.protein, 150), LIMITS.proteinGoal.min, LIMITS.proteinGoal.max, 150))
      setWaterGoal(safeNumber(firstNumber(data.water_goal, 10), LIMITS.waterCups.min, LIMITS.waterCups.max, 10))
      setTrainGoal(safeNumber(firstNumber(data.train_goal, data.training_days, 3), LIMITS.workoutsPerWeek.min, LIMITS.workoutsPerWeek.max, 3))
      setWeightStart(safeNumber(firstNumber(data.weight_start, data.start_weight, 80), LIMITS.weight.min, LIMITS.weight.max, 80))
      setWeightGoal(safeNumber(firstNumber(data.weight_goal, data.target_weight, 74), LIMITS.weight.min, LIMITS.weight.max, 74))
    }
  }

  function recalculateFromWeight() {
    setRecalcNote('')
    if (!profil?.visina || !profil?.vozrast || !profil?.pol) {
      setRecalcNote(isEn
        ? 'Complete the fitness calculator first (Profile height/age/gender missing) to enable auto-recalculation.'
        : 'Прво пополни го фитнес калкулаторот (недостасуваат висина/возраст/пол) за автоматско прерачунување.')
      return
    }
    const goal = inferGoalFromWeights(weightStart, weightGoal)
    const result = calcDailyTargets({
      weight: weightStart, height: profil.visina, age: profil.vozrast, isMale: profil.pol === 'male',
      activity: profil.aktivnost, goal,
    })
    if (!result) return
    setKcalGoal(result.kcalGoal)
    setProtGoal(result.protGoal)
    setWaterGoal(result.waterGoal)
    setRecalcNote(isEn ? '✓ Daily targets recalculated based on your target weight.' : '✓ Дневните цели се прерачунати според целната тежина.')
  }

  function validateGoalInputs() {
    const startError = rangeError(isEn ? 'Start weight' : 'Почетна тежина', weightStart, LIMITS.weight.min, LIMITS.weight.max, 'kg', isEn)
    if (startError) return startError
    const targetError = rangeError(isEn ? 'Target weight' : 'Целна тежина', weightGoal, LIMITS.weight.min, LIMITS.weight.max, 'kg', isEn)
    if (targetError) return targetError
    const kcalError = rangeError(isEn ? 'Daily calories' : 'Дневни калории', kcalGoal, LIMITS.dailyCalories.min, LIMITS.dailyCalories.max, 'kcal', isEn)
    if (kcalError) return kcalError
    const proteinError = rangeError(isEn ? 'Protein' : 'Протеини', protGoal, LIMITS.proteinGoal.min, LIMITS.proteinGoal.max, 'g', isEn)
    if (proteinError) return proteinError
    const waterError = rangeError(isEn ? 'Water cups' : 'Чаши вода', waterGoal, LIMITS.waterCups.min, LIMITS.waterCups.max, '', isEn)
    if (waterError) return waterError
    const trainingError = rangeError(isEn ? 'Workouts per week' : 'Тренинзи неделно', trainGoal, LIMITS.workoutsPerWeek.min, LIMITS.workoutsPerWeek.max, '', isEn)
    if (trainingError) return trainingError
    return ''
  }

  async function saveGoals() {
    setMessage('')
    const validationError = validateGoalInputs()
    if (validationError) {
      setMessage(validationError)
      return
    }
    setLoading(true)
    const oldGoals = {
      user_id: user.id,
      kcal_goal: toNumber(kcalGoal),
      prot_goal: toNumber(protGoal),
      water_goal: Math.round(toNumber(waterGoal)),
      train_goal: Math.round(toNumber(trainGoal)),
      weight_start: toNumber(weightStart),
      weight_goal: toNumber(weightGoal),
    }
    const newGoals = {
      user_id: user.id,
      dnevni_kalorii: toNumber(kcalGoal),
      kalorii: toNumber(kcalGoal),
      protein: toNumber(protGoal),
      water_goal: Math.round(toNumber(waterGoal)),
      training_days: Math.round(toNumber(trainGoal)),
      start_weight: toNumber(weightStart),
      target_weight: toNumber(weightGoal),
    }

    let { error } = await supabase.from('goals').upsert({ ...oldGoals, ...newGoals }, { onConflict: 'user_id' })
    if (error) {
      const res = await supabase.from('goals').upsert(oldGoals, { onConflict: 'user_id' })
      error = res.error
    }
    if (error) {
      const res = await supabase.from('goals').upsert(newGoals, { onConflict: 'user_id' })
      error = res.error
    }

    setLoading(false)
    if (error) {
      setMessage(error.message)
      return
    }

    onGoalsUpdate?.(oldGoals)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function openCalculatorAgain() {
    setMessage('')
    await supabase.from('profili').update({ onboarding_done: false }).eq('user_id', user.id)
    onResetOnboarding?.()
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEn ? 'Goals & settings' : 'Цели и поставки'}</h1>
        <p className="muted">{user.email}</p>
      </div>

      {message && <div className="auth-error">{message}</div>}

      <InstallGuideCard />
      <NotificationsCard user={user} />

      <div className="card calculator-card">
        <div className="card-title">{isEn ? 'Fitness calculator' : 'Фитнес калкулатор'}</div>
        <p className="muted" style={{ marginBottom: 12 }}>
          {isEn
            ? 'Open the onboarding calculator again to recalculate calories, protein, water and starting goals.'
            : 'Отвори го почетниот формулар повторно за да пресметаш калории, протеини, вода и почетни цели.'}
        </p>
        <button className="btn-ghost" onClick={openCalculatorAgain}>{isEn ? 'Open calculator' : 'Отвори калкулатор'}</button>
      </div>

      <div className="card">
        <div className="card-title">{isEn ? 'Weight' : 'Тежина'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div className="field"><label>{isEn ? 'Start weight (kg)' : 'Почетна тежина (кг)'}</label><input type="number" step="0.1" min={LIMITS.weight.min} max={LIMITS.weight.max} value={weightStart} onChange={e => setWeightStart(e.target.value)} onBlur={recalculateFromWeight} /></div>
          <div className="field"><label>{isEn ? 'Target weight (kg)' : 'Целна тежина (кг)'}</label><input type="number" step="0.1" min={LIMITS.weight.min} max={LIMITS.weight.max} value={weightGoal} onChange={e => setWeightGoal(e.target.value)} onBlur={recalculateFromWeight} /></div>
        </div>
        <button className="btn-ghost small" style={{ marginTop: 10 }} onClick={recalculateFromWeight}>
          {isEn ? '🔄 Recalculate daily targets' : '🔄 Прерачунај дневни цели'}
        </button>
        {recalcNote && <p className={recalcNote.startsWith('✓') ? 'auth-success' : 'auth-error'} style={{ marginTop: 8 }}>{recalcNote}</p>}
      </div>

      <div className="card">
        <div className="card-title">{isEn ? 'Daily nutrition targets' : 'Дневни цели — исхрана'}</div>
        <p className="muted small" style={{ marginBottom: 10 }}>
          {isEn ? 'Auto-filled from your target weight above — you can still fine-tune them manually.' : 'Автоматски се пополнуваат од целната тежина погоре — сепак можеш рачно да ги дотерaш.'}
        </p>
        <div className="field"><label>{isEn ? 'Daily calories (kcal)' : 'Дневни калории (kcal)'}</label><input type="number" value={kcalGoal} onChange={e => setKcalGoal(e.target.value)} min={LIMITS.dailyCalories.min} max={LIMITS.dailyCalories.max} /></div>
        <div className="field"><label>{isEn ? 'Protein (g)' : 'Протеини (g)'}</label><input type="number" value={protGoal} onChange={e => setProtGoal(e.target.value)} min={LIMITS.proteinGoal.min} max={LIMITS.proteinGoal.max} /></div>
        <div className="field"><label>{isEn ? 'Water cups per day' : 'Чаши вода на ден'}</label><input type="number" value={waterGoal} onChange={e => setWaterGoal(e.target.value)} min={LIMITS.waterCups.min} max={LIMITS.waterCups.max} /></div>
      </div>

      <div className="card">
        <div className="card-title">{isEn ? 'Workout target' : 'Тренинг цели'}</div>
        <div className="field">
          <label>{isEn ? 'Workouts per week' : 'Тренинзи неделно'}</label>
          <select value={trainGoal} onChange={e => setTrainGoal(e.target.value)}>
            {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} {isEn ? 'times per week' : 'пати неделно'}</option>)}
          </select>
        </div>
      </div>

      <button className="btn-primary" onClick={saveGoals} disabled={loading}>
        {loading ? (isEn ? 'Saving...' : 'Зачувување...') : saved ? '✓ Saved!' : (isEn ? 'Save goals' : 'Зачувај цели')}
      </button>

      <div className="card" style={{ marginTop: '24px', borderColor: '#3a1a1a' }}>
        <div className="card-title" style={{ color: '#f06060' }}>{isEn ? 'Profile' : 'Профил'}</div>
        <p className="muted" style={{ marginBottom: '12px' }}>{isEn ? 'Signed in as:' : 'Пријавен/а како:'} <strong>{user.email}</strong></p>
        <button className="btn-danger-full" onClick={logout}>{isEn ? 'Log out' : 'Одјави се'}</button>
      </div>
    </div>
  )
}

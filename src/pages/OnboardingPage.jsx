import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import { LIMITS, isInRange, rangeError, toNumber } from '../lib/validation'

const ADMIN_EMAIL = 'agencynula@gmail.com'

const GOALS = [
  { id: 'fat_loss', mk: 'Губење масти', en: 'Fat loss', icon: '🔥', kcalDelta: -400, mkDesc: 'Дефицит од ~400 kcal', enDesc: '~400 kcal deficit' },
  { id: 'recomp', mk: 'Рекомп', en: 'Recomposition', icon: '⚖️', kcalDelta: 0, mkDesc: 'Одржување на тежина', enDesc: 'Maintain weight while improving body composition' },
  { id: 'muscle_gain', mk: 'Градење мускули', en: 'Muscle gain', icon: '💪', kcalDelta: 300, mkDesc: 'Суфицит од ~300 kcal', enDesc: '~300 kcal surplus' },
]

const ACTIVITIES = [
  { id: 'sedentary', mk: 'Седечки (без тренинг)', en: 'Sedentary', icon: '🪑', factor: 1.2, mkDesc: 'Канцеларија, без вежбање', enDesc: 'Desk work, no training' },
  { id: 'light', mk: 'Лесно активен (1-2 тренинзи/нед)', en: 'Lightly active', icon: '🚶', factor: 1.375, mkDesc: 'Шетање, лесен тренинг', enDesc: 'Walking or light training' },
  { id: 'moderate', mk: 'Умерено активен (3-4 тренинзи/нед)', en: 'Moderately active', icon: '🏃', factor: 1.55, mkDesc: 'Редовен тренинг', enDesc: 'Regular weekly training' },
  { id: 'very', mk: 'Многу активен (5+ тренинзи/нед)', en: 'Very active', icon: '⚡', factor: 1.725, mkDesc: 'Интензивен тренинг секој ден', enDesc: 'Intense training most days' },
]

function getGoal(id) {
  return GOALS.find(g => g.id === id) || GOALS[0]
}

function getActivity(id) {
  return ACTIVITIES.find(a => a.id === id) || ACTIVITIES[2]
}

function calcGoals(data) {
  const weight = toNumber(data.tezina)
  const height = toNumber(data.visina)
  const age = toNumber(data.vozrast)
  if (!isInRange(age, LIMITS.age.min, LIMITS.age.max) || !isInRange(height, LIMITS.height.min, LIMITS.height.max) || !isInRange(weight, LIMITS.weight.min, LIMITS.weight.max)) return null
  const isMale = data.pol === 'male'
  const goal = getGoal(data.cel)
  const activity = getActivity(data.aktivnost)

  const bmr = isMale
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161

  const tdee = Math.round(bmr * activity.factor)
  const kcalGoal = Math.min(5000, Math.max(1200, Math.round(tdee + goal.kcalDelta)))
  const protFactor = goal.id === 'muscle_gain' ? 2.2 : 1.8
  const protGoal = Math.min(350, Math.max(20, Math.round(weight * protFactor)))
  const waterGoal = Math.min(20, Math.max(4, Math.round((weight * 35) / 250)))
  const targetWeight = goal.id === 'fat_loss'
    ? Math.round(weight * 0.9 * 10) / 10
    : goal.id === 'muscle_gain'
      ? Math.round(weight * 1.05 * 10) / 10
      : weight

  return {
    bmr: Math.round(bmr),
    tdee,
    kcalGoal,
    protGoal,
    waterGoal,
    targetWeight,
    trainingDays: activity.id === 'very' ? 5 : activity.id === 'moderate' ? 3 : activity.id === 'light' ? 2 : 2,
    goal,
    activity,
  }
}

async function trySupabase(label, action) {
  const { error } = await action()
  if (error) {
    console.warn(label, error.message)
    return false
  }
  return true
}

export default function OnboardingPage({ user, onDone }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [step, setStep] = useState(0)
  const [pol, setPol] = useState('female')
  const [vozrast, setVozrast] = useState('')
  const [visina, setVisina] = useState('')
  const [tezina, setTezina] = useState('')
  const [cel, setCel] = useState('fat_loss')
  const [aktivnost, setAktivnost] = useState('moderate')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const rezultat = useMemo(() => {
    if (!isInRange(vozrast, LIMITS.age.min, LIMITS.age.max)) return null
    if (!isInRange(visina, LIMITS.height.min, LIMITS.height.max)) return null
    if (!isInRange(tezina, LIMITS.weight.min, LIMITS.weight.max)) return null
    return calcGoals({ pol, vozrast, visina, tezina, cel, aktivnost })
  }, [pol, vozrast, visina, tezina, cel, aktivnost])

  const text = {
    basicTitle: isEn ? 'Basic information' : 'Основни податоци',
    basicSub: isEn ? 'We use this to calculate realistic fitness targets.' : 'Ќе ги користиме за точни пресметки',
    gender: isEn ? 'Gender' : 'Пол',
    male: isEn ? 'Male' : 'Машко',
    female: isEn ? 'Female' : 'Женско',
    age: isEn ? 'Age' : 'Возраст (години)',
    height: isEn ? 'Height (cm)' : 'Висина (цм)',
    weight: isEn ? 'Weight (kg)' : 'Тежина (кг)',
    goalTitle: isEn ? 'What is your goal?' : 'Која е твојата цел?',
    goalSub: isEn ? 'Calories and protein will be adjusted to your goal.' : 'Ќе ги прилагодиме калориите и протеините',
    activityTitle: isEn ? 'How active are you?' : 'Колку си активен/активна?',
    activitySub: isEn ? 'This determines your daily calorie needs.' : 'Ова ја одредува дневната калориска потреба',
    resultTitle: isEn ? 'Your starting targets' : 'Твоите цели',
    resultSub: isEn ? 'Calculated from your data. You can edit them later.' : 'Пресметано според твоите податоци. Можеш да ги смениш подоцна.',
    fill: isEn ? 'Fill in age, height and weight.' : 'Пополни возраст, висина и тежина.',
    back: isEn ? 'Back' : 'Назад',
    next: isEn ? 'Continue' : 'Продолжи',
    start: isEn ? 'Start the plan!' : 'Започни го планот!',
    saving: isEn ? 'Saving...' : 'Зачувување...',
    tdee: isEn ? 'TDEE maintenance' : 'TDEE (одржување)',
    calories: isEn ? 'Daily calories' : 'Дневни калории',
    protein: isEn ? 'Protein / day' : 'Протеини / ден',
    water: isEn ? 'Water cups / day' : 'Чаши вода / ден',
    activity: isEn ? 'Activity' : 'Активност',
    goal: isEn ? 'Goal' : 'Цел',
  }

  function validateBasicInputs() {
    const ageError = rangeError(text.age, vozrast, LIMITS.age.min, LIMITS.age.max, isEn ? 'years' : 'години', isEn)
    if (ageError) return ageError
    const heightError = rangeError(text.height, visina, LIMITS.height.min, LIMITS.height.max, 'cm', isEn)
    if (heightError) return heightError
    const weightError = rangeError(text.weight, tezina, LIMITS.weight.min, LIMITS.weight.max, 'kg', isEn)
    if (weightError) return weightError
    return ''
  }

  function nextStep() {
    setSaveError('')
    if (step === 0) {
      const error = validateBasicInputs()
      if (error) {
        setSaveError(error)
        return
      }
    }
    setStep(s => Math.min(3, s + 1))
  }

  async function saveAndFinish() {
    const error = validateBasicInputs()
    if (error) {
      setSaveError(error)
      return
    }
    if (!rezultat) return alert(text.fill)
    setSaving(true)
    setSaveError('')

    const fullName = (user.user_metadata?.full_name || '').trim()
    const metaIme = user.user_metadata?.ime || user.user_metadata?.first_name || fullName.split(' ')[0] || null
    const metaPrezime = user.user_metadata?.prezime || user.user_metadata?.last_name || fullName.split(' ').slice(1).join(' ') || null
    const goal = getGoal(cel)
    const activity = getActivity(aktivnost)
    const today = new Date().toISOString().slice(0, 10)
    const profileFull = {
      user_id: user.id,
      email: user.email?.toLowerCase() || null,
      ime: metaIme,
      prezime: metaPrezime,
      full_name: fullName || [metaIme, metaPrezime].filter(Boolean).join(' ') || null,
      visina: toNumber(visina),
      tezina: toNumber(tezina),
      pol: pol === 'male' ? 'Машко' : 'Женско',
      vozrast: toNumber(vozrast),
      cel: isEn ? goal.en : goal.mk,
      aktivnost: isEn ? activity.en : activity.mk,
      onboarding_done: true,
    }

    const profileOk = await trySupabase('profile full save', () => supabase.from('profili').upsert(profileFull, { onConflict: 'user_id' }))
    if (!profileOk) {
      await trySupabase('profile fallback save', () => supabase.from('profili').upsert({
        user_id: user.id,
        email: user.email?.toLowerCase() || null,
        full_name: profileFull.full_name,
        visina: toNumber(visina),
        onboarding_done: true,
      }, { onConflict: 'user_id' }))
    }

    const measureFull = {
      user_id: user.id,
      datum: today,
      tezina: toNumber(tezina),
      bmi: Math.round((toNumber(tezina) / Math.pow(toNumber(visina) / 100, 2)) * 10) / 10,
      beleshka: isEn ? 'Starting measurement' : 'Почетна мерка',
    }
    const measureOk = await trySupabase('measurement full save', () => supabase.from('merki').insert(measureFull))
    if (!measureOk) {
      await trySupabase('measurement fallback save', () => supabase.from('merki').insert({ user_id: user.id, datum: today, tezina: toNumber(tezina) }))
    }

    const oldGoals = {
      user_id: user.id,
      kcal_goal: rezultat.kcalGoal,
      prot_goal: rezultat.protGoal,
      water_goal: rezultat.waterGoal,
      train_goal: rezultat.trainingDays,
      weight_start: toNumber(tezina),
      weight_goal: rezultat.targetWeight,
    }
    const newGoals = {
      user_id: user.id,
      cel: isEn ? goal.en : goal.mk,
      goal_type: cel,
      visina: toNumber(visina),
      start_weight: toNumber(tezina),
      target_weight: rezultat.targetWeight,
      kalorii: rezultat.kcalGoal,
      dnevni_kalorii: rezultat.kcalGoal,
      protein: rezultat.protGoal,
      carbs: Math.round((rezultat.kcalGoal * 0.35) / 4),
      fats: Math.round((rezultat.kcalGoal * 0.25) / 9),
      water_goal: rezultat.waterGoal,
      training_days: rezultat.trainingDays,
    }

    let goalsOk = await trySupabase('goals full save', () => supabase.from('goals').upsert({ ...oldGoals, ...newGoals }, { onConflict: 'user_id' }))
    if (!goalsOk) goalsOk = await trySupabase('goals old save', () => supabase.from('goals').upsert(oldGoals, { onConflict: 'user_id' }))
    if (!goalsOk) goalsOk = await trySupabase('goals new save', () => supabase.from('goals').upsert(newGoals, { onConflict: 'user_id' }))

    setSaving(false)

    if (!goalsOk) {
      setSaveError(isEn ? 'The calculator is ready, but goals could not be saved. Check Supabase schema.' : 'Калкулаторот е подготвен, но целите не можеа да се зачуваат. Провери Supabase schema.')
      return
    }

    onDone?.()
  }

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-box onboarding-calculator-box">
        <div className="onboarding-logo">FITNESS</div>

        <div className="onboarding-progress">
          {[0, 1, 2, 3].map(i => <div key={i} className={`onboarding-dot ${i <= step ? 'done' : ''}`} />)}
        </div>

        {step === 0 && (
          <div className="onboarding-step">
            <h2>{text.basicTitle}</h2>
            <p className="muted">{text.basicSub}</p>

            <div className="field" style={{ marginTop: 20 }}>
              <label>{text.gender}</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${pol === 'male' ? 'active' : ''}`} onClick={() => setPol('male')}>{text.male}</button>
                <button type="button" className={`toggle-btn ${pol === 'female' ? 'active' : ''}`} onClick={() => setPol('female')}>{text.female}</button>
              </div>
            </div>

            <div className="field">
              <label>{text.age}</label>
              <input type="number" placeholder="25" min={LIMITS.age.min} max={LIMITS.age.max} value={vozrast} onChange={e => setVozrast(e.target.value)} />
            </div>

            <div className="onboarding-two-col">
              <div className="field">
                <label>{text.height}</label>
                <input type="number" placeholder="168" min={LIMITS.height.min} max={LIMITS.height.max} value={visina} onChange={e => setVisina(e.target.value)} />
              </div>
              <div className="field">
                <label>{text.weight}</label>
                <input type="number" placeholder="60" min={LIMITS.weight.min} max={LIMITS.weight.max} step="0.1" value={tezina} onChange={e => setTezina(e.target.value)} />
              </div>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              {isEn ? 'Allowed ranges: age 13-90, height 100-230cm, weight 30-250kg.' : 'Дозволени вредности: возраст 13-90, висина 100-230цм, тежина 30-250кг.'}
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step">
            <h2>{text.goalTitle}</h2>
            <p className="muted">{text.goalSub}</p>
            <div className="goal-grid" style={{ marginTop: 20 }}>
              {GOALS.map(g => (
                <button type="button" key={g.id} className={`goal-card ${cel === g.id ? 'active' : ''}`} onClick={() => setCel(g.id)}>
                  <div className="goal-icon">{g.icon}</div>
                  <div className="goal-copy">
                    <div className="goal-name">{isEn ? g.en : g.mk}</div>
                    <div className="goal-desc">{isEn ? g.enDesc : g.mkDesc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <h2>{text.activityTitle}</h2>
            <p className="muted">{text.activitySub}</p>
            <div className="goal-grid" style={{ marginTop: 20 }}>
              {ACTIVITIES.map(a => (
                <button type="button" key={a.id} className={`aktivnost-card ${aktivnost === a.id ? 'active' : ''}`} onClick={() => setAktivnost(a.id)}>
                  <span className="aktivnost-icon">{a.icon}</span>
                  <div>
                    <div className="aktivnost-name">{isEn ? a.en : a.mk}</div>
                    <div className="aktivnost-desc">{isEn ? a.enDesc : a.mkDesc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && rezultat && (
          <div className="onboarding-step">
            <h2>{text.resultTitle}</h2>
            <p className="muted">{text.resultSub}</p>
            <div className="rezultat-grid">
              <div className="rezultat-card"><div className="rezultat-val">{rezultat.tdee}</div><div className="rezultat-label">{text.tdee}</div></div>
              <div className="rezultat-card accent"><div className="rezultat-val">{rezultat.kcalGoal}</div><div className="rezultat-label">{text.calories}</div></div>
              <div className="rezultat-card"><div className="rezultat-val">{rezultat.protGoal}g</div><div className="rezultat-label">{text.protein}</div></div>
              <div className="rezultat-card"><div className="rezultat-val">{rezultat.waterGoal}</div><div className="rezultat-label">{text.water}</div></div>
            </div>
            <div className="rezultat-formula">
              <div>BMR: <strong>{rezultat.bmr} kcal</strong> · {text.goal}: <strong>{isEn ? rezultat.goal.en : rezultat.goal.mk}</strong></div>
              <div>{text.activity}: <strong>{isEn ? rezultat.activity.en : rezultat.activity.mk}</strong></div>
            </div>
          </div>
        )}

        {saveError && <div className="auth-error">{saveError}</div>}

        <div className="onboarding-btns">
          {step > 0 && <button type="button" className="btn-ghost" onClick={() => setStep(s => s - 1)}>{text.back}</button>}
          {step < 3 && <button type="button" className="btn-primary" onClick={nextStep}>{text.next}</button>}
          {step === 3 && <button type="button" className="btn-primary" onClick={saveAndFinish} disabled={saving}>{saving ? text.saving : text.start}</button>}
        </div>
      </div>
    </div>
  )
}

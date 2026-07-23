import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Collapsible from '../components/Collapsible'
import { LIMITS, optionalRangeError, cleanText, toNumber, positiveNumberInput } from '../lib/validation'
import { useLanguage } from '../lib/LanguageContext'

const DEFAULT_VEZBI = [
  { grupa: 'Горен дел', vezbi: ['Склекови', 'Пајк склекови', 'Широки склекови', 'Повлекување (Pull-ups)', 'Австралиски повлекувања', 'Дипови', 'Bench press', 'Overhead press', 'Bent-over row'] },
  { grupa: 'Абдоминали', vezbi: ['Планк', 'Висење подигања на нозе', 'Hollow body hold', 'L-sit', 'Кризови', 'Dead bug', 'Mountain climbers'] },
  { grupa: 'Долен дел', vezbi: ['Чучњеви', 'Лунџи', 'Пистол чучањ', 'Глутеус мост', 'Hip thrust', 'Leg press', 'Romanian deadlift', 'Calf raises'] },
  { grupa: 'Кардио', vezbi: ['Трчање — Зона 2', 'Интервали', 'Спринт', 'Фартлек', 'Брзо пешачење', 'Велосипед'] },
  { grupa: 'Тегови', vezbi: ['Deadlift', 'Squat со тегови', 'Lat pulldown', 'Seated row', 'Bicep curl', 'Tricep extension', 'Shoulder press'] },
]

const WORKOUT_TEMPLATES = [
  {
    id: 'home-beginner',
    label: 'Почетен дома',
    name: 'Почетен тренинг дома',
    type: 'Дома',
    exercises: [
      { grupa: 'Горен дел', naziv: 'Склекови', sets: [{ povtoruvanja: '8', kg: '' }, { povtoruvanja: '8', kg: '' }, { povtoruvanja: '8', kg: '' }] },
      { grupa: 'Абдоминали', naziv: 'Кризови', sets: [{ povtoruvanja: '15', kg: '' }, { povtoruvanja: '15', kg: '' }, { povtoruvanja: '15', kg: '' }] },
      { grupa: 'Долен дел', naziv: 'Чучњеви', sets: [{ povtoruvanja: '12', kg: '' }, { povtoruvanja: '12', kg: '' }, { povtoruvanja: '12', kg: '' }] },
      { grupa: 'Абдоминали', naziv: 'Планк', sets: [{ povtoruvanja: '30 сек', kg: '' }, { povtoruvanja: '30 сек', kg: '' }, { povtoruvanja: '30 сек', kg: '' }] },
    ]
  },
  {
    id: 'gym-beginner',
    label: 'Почетен теретана',
    name: 'Почетен тренинг теретана',
    type: 'Теретана',
    exercises: [
      { grupa: 'Долен дел', naziv: 'Leg press', sets: [{ povtoruvanja: '10', kg: '' }, { povtoruvanja: '10', kg: '' }, { povtoruvanja: '10', kg: '' }] },
      { grupa: 'Горен дел', naziv: 'Lat pulldown', sets: [{ povtoruvanja: '10', kg: '' }, { povtoruvanja: '10', kg: '' }, { povtoruvanja: '10', kg: '' }] },
      { grupa: 'Горен дел', naziv: 'Bench press', sets: [{ povtoruvanja: '8', kg: '' }, { povtoruvanja: '8', kg: '' }, { povtoruvanja: '8', kg: '' }] },
      { grupa: 'Долен дел', naziv: 'Romanian deadlift', sets: [{ povtoruvanja: '10', kg: '' }, { povtoruvanja: '10', kg: '' }, { povtoruvanja: '10', kg: '' }] },
      { grupa: 'Абдоминали', naziv: 'Планк', sets: [{ povtoruvanja: '30 сек', kg: '' }, { povtoruvanja: '30 сек', kg: '' }, { povtoruvanja: '30 сек', kg: '' }] },
    ]
  }
]

const today = () => new Date().toISOString().slice(0, 10)
const makeId = () => crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`

function normalizeSets(sets = []) {
  return sets.map((s, index) => ({
    serija: index + 1,
    povtoruvanja: String(s.povtoruvanja ?? '').trim(),
    kg: String(s.kg ?? '').trim(),
  })).filter(s => s.povtoruvanja || s.kg)
}

function parseWorkout(row) {
  let parsed = row.seriji
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed || '[]') } catch { parsed = [] }
  }

  if (parsed?.type === 'workout_session' && Array.isArray(parsed.exercises)) {
    return {
      isSession: true,
      name: row.naziv,
      type: parsed.workoutType || 'Тренинг',
      exercises: parsed.exercises.map((ex, index) => ({
        id: ex.id || `${row.id}-${index}`,
        naziv: ex.naziv || 'Вежба',
        grupa: ex.grupa || 'Друго',
        sets: normalizeSets(ex.sets || []),
      })),
    }
  }

  const legacySets = Array.isArray(parsed) ? parsed : []
  return {
    isSession: false,
    name: row.naziv,
    type: 'Стар запис',
    exercises: [{ id: `${row.id}-legacy`, naziv: row.naziv, grupa: 'Друго', sets: normalizeSets(legacySets) }],
  }
}

function calcExerciseMaxKg(exercise) {
  return Math.max(0, ...normalizeSets(exercise.sets).map(s => toNumber(s.kg) || 0))
}

function calcTotalVolume(exercises) {
  return exercises.reduce((total, ex) => {
    return total + normalizeSets(ex.sets).reduce((sum, s) => {
      const reps = toNumber(String(s.povtoruvanja).replace(',', '.')) || 0
      const kg = toNumber(String(s.kg).replace(',', '.')) || 0
      return sum + reps * kg
    }, 0)
  }, 0)
}

export default function VezbiPage({ user }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const t = {
    title: isEn ? 'Workouts' : 'Вежби',
    manageBack: isEn ? '← Back to workout' : '← Назад кон тренинг',
    manage: isEn ? '⚙ Manage exercises' : '⚙ Управувај со вежби',
    addCustom: isEn ? 'Add custom exercise' : 'Додади своја вежба',
    exerciseName: isEn ? 'Exercise name' : 'Назив на вежбата',
    group: isEn ? 'Group' : 'Група',
    addExercise: isEn ? 'Add exercise' : 'Додади вежба',
    myExercises: isEn ? 'My exercises' : 'Моите вежби',
    hideDefaults: isEn ? 'Hide default exercises' : 'Сокриј дефолтни вежби',
    hideHelp: isEn ? 'Mark exercises you do not use. They will not be shown while building a workout.' : 'Означи ги вежбите кои не ги користиш. Тие нема да се прикажуваат при градење тренинг.',
    newWorkout: isEn ? 'New workout' : 'Нов тренинг',
    builderHelp: isEn ? 'Add multiple exercises into one workout. When saved, everything is logged as one workout session.' : 'Додај повеќе вежби во еден тренинг. Кога ќе зачуваш, сите вежби се снимаат како една тренинг-сесија.',
    workoutName: isEn ? 'Workout name' : 'Име на тренинг',
    type: isEn ? 'Type' : 'Тип',
    date: isEn ? 'Date' : 'Датум',
    addToWorkout: isEn ? 'Add exercise to workout' : 'Додај вежба во тренингот',
    addSelected: isEn ? '+ Add selected exercise' : '+ Додај избрана вежба',
    addBlank: isEn ? '+ Blank exercise' : '+ Празна вежба',
    emptyWorkout: isEn ? 'No exercises in this workout yet.' : 'Сè уште нема вежби во овој тренинг.',
    series: isEn ? 'Set' : 'Серија',
    reps: isEn ? 'Reps/time' : 'Повт./време',
    kg: isEn ? 'Kg' : 'Кг',
    addSet: isEn ? '+ Add set' : '+ Додади серија',
    note: isEn ? 'Note for the full workout' : 'Белешка за целиот тренинг',
    notePh: isEn ? 'e.g. good energy, easy, hard workout...' : 'пр. добро чувство, лесно, тежок тренинг...',
    saving: isEn ? 'Saving...' : 'Зачувување...',
    saveWorkout: isEn ? 'Save full workout' : 'Зачувај цел тренинг',
    clear: isEn ? 'Clear' : 'Исчисти',
    progressByExercise: isEn ? 'Progress by exercise' : 'Напредок по вежба',
    maxKg: isEn ? 'Max kg' : 'Макс кг',
    notEnough: isEn ? 'Not enough kg records for a chart.' : 'Нема доволно записи со кг за графикон.',
    history: isEn ? 'History' : 'Историја',
    noWorkouts: isEn ? 'No workouts logged yet.' : 'Нема запишани тренинзи уште.',
    exercises: isEn ? 'exercises' : 'вежби',
    saveError: isEn ? 'Could not save the workout. Check Supabase schema.' : 'Не може да се зачува тренингот. Провери Supabase schema.',
    validationName: isEn ? 'Enter a workout name.' : 'Внеси име на тренинг!',
    validationNameLong: isEn ? 'Workout name is too long. Maximum 70 characters.' : 'Името на тренингот е предолго. Максимум 70 карактери.',
    validationExercise: isEn ? 'Add at least one exercise with sets.' : 'Додади барем една вежба со серии!',
    validationExerciseName: isEn ? 'Exercise name is too long.' : 'Името на вежбата е предолго.',
    validationReps: isEn ? 'The reps/time field can have up to 20 characters.' : 'Полето за повторувања/време може да има максимум 20 карактери.',
  }
  const [activeGrupa, setActiveGrupa] = useState('Горен дел')
  const [selectedVezba, setSelectedVezba] = useState('')
  const [workoutName, setWorkoutName] = useState('Full Body тренинг')
  const [workoutType, setWorkoutType] = useState('Дома')
  const [workoutExercises, setWorkoutExercises] = useState([])
  const [datum, setDatum] = useState(today())
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [chartVezba, setChartVezba] = useState('')
  const [chartData, setChartData] = useState([])
  const [customVezbi, setCustomVezbi] = useState([])
  const [hiddenVezbi, setHiddenVezbi] = useState([])
  const [showManage, setShowManage] = useState(false)
  const [newVezbaName, setNewVezbaName] = useState('')
  const [newVezbaGrupa, setNewVezbaGrupa] = useState('Горен дел')
  const [savingCustom, setSavingCustom] = useState(false)
  const [customError, setCustomError] = useState('')

  const allGrupi = () => {
    const grupiMap = {}
    DEFAULT_VEZBI.forEach(g => {
      grupiMap[g.grupa] = g.vezbi.filter(v => !hiddenVezbi.includes(v))
    })
    customVezbi.forEach(c => {
      if (!grupiMap[c.grupa]) grupiMap[c.grupa] = []
      if (!grupiMap[c.grupa].includes(c.naziv)) grupiMap[c.grupa].push(c.naziv)
    })
    return Object.entries(grupiMap)
      .filter(([, v]) => v.length > 0)
      .map(([grupa, vezbi]) => ({ grupa, vezbi }))
  }

  useEffect(() => { loadHistory(); loadCustomVezbi(); loadHidden() }, [])

  async function loadCustomVezbi() {
    const { data } = await supabase.from('custom_vezbi').select('*').eq('user_id', user.id).order('created_at')
    setCustomVezbi(data || [])
  }

  async function loadHidden() {
    const { data } = await supabase.from('hidden_vezbi').select('naziv').eq('user_id', user.id)
    setHiddenVezbi(data?.map(d => d.naziv) || [])
  }

  async function loadHistory() {
    const { data } = await supabase.from('vezbi').select('*').eq('user_id', user.id).order('datum', { ascending: false }).order('created_at', { ascending: false }).limit(50)
    setHistory(data || [])
  }

  async function addCustomVezba() {
    const cleanName = cleanText(newVezbaName, 60)
    if (!cleanName) return
    if (cleanName.length < newVezbaName.trim().length) {
      setCustomError('Името на вежбата е предолго. Максимум 60 карактери.')
      return
    }
    setSavingCustom(true)
    setCustomError('')
    const { error } = await supabase.from('custom_vezbi').insert({ user_id: user.id, naziv: cleanName, grupa: newVezbaGrupa })
    if (error) {
      setCustomError(`Не успеа зачувување: ${error.message}`)
      setSavingCustom(false)
      return
    }
    setNewVezbaName('')
    await loadCustomVezbi()
    setActiveGrupa(newVezbaGrupa)
    setShowManage(false)
    setSavingCustom(false)
  }

  async function deleteCustomVezba(id) {
    await supabase.from('custom_vezbi').delete().eq('id', id)
    loadCustomVezbi()
  }

  async function toggleHideDefault(naziv) {
    if (hiddenVezbi.includes(naziv)) {
      await supabase.from('hidden_vezbi').delete().eq('user_id', user.id).eq('naziv', naziv)
      setHiddenVezbi(hiddenVezbi.filter(v => v !== naziv))
    } else {
      await supabase.from('hidden_vezbi').insert({ user_id: user.id, naziv })
      setHiddenVezbi([...hiddenVezbi, naziv])
      if (selectedVezba === naziv) setSelectedVezba('')
    }
  }

  function addSelectedExercise() {
    if (!selectedVezba) return
    setWorkoutExercises(prev => [
      ...prev,
      {
        id: makeId(),
        grupa: activeGrupa,
        naziv: selectedVezba,
        sets: [
          { serija: 1, povtoruvanja: '', kg: '' },
          { serija: 2, povtoruvanja: '', kg: '' },
          { serija: 3, povtoruvanja: '', kg: '' },
        ],
      }
    ])
    setSelectedVezba('')
  }

  function addBlankExercise() {
    setWorkoutExercises(prev => [
      ...prev,
      {
        id: makeId(),
        grupa: 'Мои вежби',
        naziv: '',
        sets: [
          { serija: 1, povtoruvanja: '', kg: '' },
          { serija: 2, povtoruvanja: '', kg: '' },
          { serija: 3, povtoruvanja: '', kg: '' },
        ],
      }
    ])
  }

  function applyTemplate(template) {
    setWorkoutName(template.name)
    setWorkoutType(template.type)
    setWorkoutExercises(template.exercises.map(ex => ({
      id: makeId(),
      grupa: ex.grupa,
      naziv: ex.naziv,
      sets: ex.sets.map((s, i) => ({ serija: i + 1, povtoruvanja: s.povtoruvanja, kg: s.kg })),
    })))
  }

  function updateExercise(id, field, value) {
    setWorkoutExercises(prev => prev.map(ex => ex.id === id ? { ...ex, [field]: value } : ex))
  }

  function updateSet(exerciseId, setIndex, field, value) {
    setWorkoutExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex
      const sets = [...ex.sets]
      sets[setIndex] = { ...sets[setIndex], [field]: value }
      return { ...ex, sets }
    }))
  }

  function addSet(exerciseId) {
    setWorkoutExercises(prev => prev.map(ex => ex.id === exerciseId
      ? { ...ex, sets: [...ex.sets, { serija: ex.sets.length + 1, povtoruvanja: '', kg: '' }] }
      : ex
    ))
  }

  function removeSet(exerciseId, setIndex) {
    setWorkoutExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex
      const sets = ex.sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, serija: i + 1 }))
      return { ...ex, sets }
    }))
  }

  function removeExercise(id) {
    setWorkoutExercises(prev => prev.filter(ex => ex.id !== id))
  }

  function resetWorkout() {
    setWorkoutName('Full Body тренинг')
    setWorkoutType('Дома')
    setWorkoutExercises([])
    setNote('')
    setDatum(today())
  }

  function validateWorkout(cleanExercises) {
    if (!cleanText(workoutName, 70)) return t.validationName
    if (cleanText(workoutName, 70).length < workoutName.trim().length) return t.validationNameLong
    if (!cleanExercises.length) return t.validationExercise
    for (const ex of cleanExercises) {
      if (ex.naziv.length > 60) return `${t.validationExerciseName} ${ex.naziv.slice(0, 20)}...`
      for (const set of ex.sets) {
        const kgError = optionalRangeError('Килограми', set.kg, LIMITS.exerciseKg.min, LIMITS.exerciseKg.max, 'kg')
        if (kgError) return kgError
        if (set.povtoruvanja.length > 20) return t.validationReps
      }
    }
    if (note.length > 200) return 'Белешката може да има максимум 200 карактери.'
    return ''
  }

  async function saveWorkout() {
    const cleanExercises = workoutExercises
      .map(ex => ({ ...ex, naziv: cleanText(ex.naziv, 60), sets: normalizeSets(ex.sets) }))
      .filter(ex => ex.naziv && ex.sets.length > 0)

    const validationError = validateWorkout(cleanExercises)
    if (validationError) return alert(validationError)

    setLoading(true)
    const maxKg = Math.max(0, ...cleanExercises.map(calcExerciseMaxKg))
    const totalVol = calcTotalVolume(cleanExercises)

    const payload = {
      type: 'workout_session',
      workoutType,
      exercises: cleanExercises.map((ex, index) => ({
        order: index + 1,
        grupa: ex.grupa,
        naziv: ex.naziv,
        sets: ex.sets,
      })),
    }

    const { error } = await supabase.from('vezbi').insert({
      user_id: user.id,
      naziv: cleanText(workoutName, 70),
      datum,
      seriji: payload,
      max_kg: maxKg,
      total_volumen: totalVol,
      beleshka: cleanText(note, 200),
    })

    if (error) {
      console.error(error)
      alert(t.saveError)
    } else {
      resetWorkout()
      loadHistory()
    }
    setLoading(false)
  }

  async function deleteWorkout(id) {
    await supabase.from('vezbi').delete().eq('id', id)
    loadHistory()
  }

  async function loadChart(vezba) {
    setChartVezba(vezba)
    const { data } = await supabase.from('vezbi').select('*').eq('user_id', user.id).order('datum', { ascending: true }).limit(200)
    const points = []
    ;(data || []).forEach(row => {
      const session = parseWorkout(row)
      const ex = session.exercises.find(e => e.naziv === vezba)
      if (!ex) return
      const maxKg = calcExerciseMaxKg(ex)
      if (maxKg > 0) points.push({ datum: row.datum.slice(5), kg: maxKg })
    })
    setChartData(points.slice(-20))
  }

  const groupedHistory = history.reduce((acc, v) => {
    if (!acc[v.datum]) acc[v.datum] = []
    acc[v.datum].push(v)
    return acc
  }, {})

  const grupiList = allGrupi()
  const historyExerciseNames = [...new Set(history.flatMap(row => parseWorkout(row).exercises.map(ex => ex.naziv)))].filter(Boolean)

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>{t.title}</h1>
        <button className="btn-ghost small" onClick={() => setShowManage(!showManage)} style={{ marginTop: '8px' }}>
          {showManage ? t.manageBack : t.manage}
        </button>
      </div>

      {showManage ? (
        <>
          <div className="card">
            <div className="card-title">{t.addCustom}</div>
            <div className="field">
              <label>{t.exerciseName}</label>
              <input
                type="text"
                placeholder="пр. Bulgarian split squat"
                value={newVezbaName}
                maxLength="60"
                onChange={e => setNewVezbaName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomVezba()}
              />
            </div>
            <div className="field">
              <label>{t.group}</label>
              <select value={newVezbaGrupa} onChange={e => setNewVezbaGrupa(e.target.value)}>
                {DEFAULT_VEZBI.map(g => <option key={g.grupa}>{g.grupa}</option>)}
                <option>Мои вежби</option>
              </select>
            </div>
            <button className="btn-primary" onClick={addCustomVezba} disabled={savingCustom}>
              {savingCustom ? '...' : t.addExercise}
            </button>
            {customError && <p className="auth-error" style={{ marginTop: 10 }}>{customError}</p>}
          </div>

          {customVezbi.length > 0 && (
            <div className="card">
              <div className="card-title">{t.myExercises}</div>
              {customVezbi.map(c => (
                <div key={c.id} className="history-entry">
                  <div className="history-main">
                    <div className="history-name">{c.naziv}</div>
                    <div className="history-meta"><span className="set-badge">{c.grupa}</span></div>
                  </div>
                  <button className="btn-icon danger" onClick={() => deleteCustomVezba(c.id)}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="card-title">{t.hideDefaults}</div>
            <p className="muted" style={{ marginBottom: '12px', fontSize: '13px' }}>
              {t.hideHelp}
            </p>
            {DEFAULT_VEZBI.map(g => (
              <div key={g.grupa} style={{ marginBottom: '14px' }}>
                <div className="history-date">{g.grupa}</div>
                {g.vezbi.map(v => {
                  const hidden = hiddenVezbi.includes(v)
                  return (
                    <div key={v} className="supl-row" onClick={() => toggleHideDefault(v)} style={{ padding: '8px 0' }}>
                      <div className="check-box" style={{ background: hidden ? '#3a1a1a' : '', borderColor: hidden ? '#f06060' : '' }}>
                        {hidden ? '✕' : ''}
                      </div>
                      <div style={{ fontSize: '14px', color: hidden ? 'var(--accent3)' : 'var(--text)', textDecoration: hidden ? 'line-through' : 'none' }}>
                        {v}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="card workout-builder-card">
            <div className="card-title">{t.newWorkout}</div>
            <p className="muted small" style={{ marginBottom: '14px' }}>
              {t.builderHelp}
            </p>

            <div className="workout-top-grid">
              <div className="field">
                <label>{t.workoutName}</label>
                <input value={workoutName} maxLength="70" onChange={e => setWorkoutName(e.target.value)} placeholder={isEn ? 'e.g. Full Body - Day 1' : 'пр. Full Body - Ден 1'} />
              </div>
              <div className="field">
                <label>{t.type}</label>
                <select value={workoutType} onChange={e => setWorkoutType(e.target.value)}>
                  <option value="Дома">{isEn ? 'Home' : 'Дома'}</option>
                  <option value="Теретана">{isEn ? 'Gym' : 'Теретана'}</option>
                  <option value="Кардио">{isEn ? 'Cardio' : 'Кардио'}</option>
                  <option value="Мобилност">{isEn ? 'Mobility' : 'Мобилност'}</option>
                </select>
              </div>
              <div className="field">
                <label>{t.date}</label>
                <input type="date" value={datum} onChange={e => setDatum(e.target.value)} />
              </div>
            </div>

            <div className="template-row">
              {WORKOUT_TEMPLATES.map(template => (
                <button key={template.id} className="btn-ghost small" onClick={() => applyTemplate(template)}>
                  + {template.label}
                </button>
              ))}
            </div>

            <div className="history-date" style={{ marginTop: '18px' }}>{t.addToWorkout}</div>
            <div className="grupa-tabs">
              {grupiList.map(g => (
                <button
                  key={g.grupa}
                  className={`tab-pill ${activeGrupa === g.grupa ? 'active' : ''}`}
                  onClick={() => { setActiveGrupa(g.grupa); setSelectedVezba('') }}
                >
                  {g.grupa}
                </button>
              ))}
            </div>
            <div className="vezbi-grid">
              {grupiList.find(g => g.grupa === activeGrupa)?.vezbi.map(v => (
                <button
                  key={v}
                  className={`vezba-btn ${selectedVezba === v ? 'selected' : ''}`}
                  onClick={() => setSelectedVezba(v)}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="plan-actions" style={{ marginTop: '10px' }}>
              <button className="btn-primary" onClick={addSelectedExercise} disabled={!selectedVezba}>{t.addSelected}</button>
              <button className="btn-ghost" onClick={addBlankExercise}>{t.addBlank}</button>
            </div>

            <div className="workout-exercise-list">
              {workoutExercises.length === 0 && <p className="muted center">{t.emptyWorkout}</p>}
              {workoutExercises.map((exercise, exerciseIndex) => (
                <div key={exercise.id} className="workout-exercise-card">
                  <div className="workout-exercise-head">
                    <span className="badge-green">#{exerciseIndex + 1}</span>
                    <input
                      value={exercise.naziv}
                      maxLength="60"
                      onChange={e => updateExercise(exercise.id, 'naziv', e.target.value)}
                      placeholder={isEn ? 'Exercise name' : 'Назив на вежба'}
                    />
                    <button className="btn-icon danger" onClick={() => removeExercise(exercise.id)}>✕</button>
                  </div>
                  <div className="sets-header">
                    <span>{t.series}</span>
                    <span>{t.reps}</span>
                    <span>{t.kg}</span>
                    <span></span>
                  </div>
                  {exercise.sets.map((s, setIndex) => (
                    <div key={setIndex} className="set-row">
                      <span className="set-num">{setIndex + 1}</span>
                      <input
                        type="text"
                        placeholder={isEn ? '10 / 30 sec' : '10 / 30 сек'}
                        value={s.povtoruvanja}
                        onChange={e => updateSet(exercise.id, setIndex, 'povtoruvanja', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="0"
                        min={LIMITS.exerciseKg.min}
                        max={LIMITS.exerciseKg.max}
                        step="0.5"
                        value={s.kg}
                        onChange={e => updateSet(exercise.id, setIndex, 'kg', positiveNumberInput(e.target.value))}
                      />
                      {exercise.sets.length > 1 && <button className="btn-icon" onClick={() => removeSet(exercise.id, setIndex)}>✕</button>}
                    </div>
                  ))}
                  <button className="btn-ghost small" onClick={() => addSet(exercise.id)} style={{ marginTop: '6px' }}>{t.addSet}</button>
                </div>
              ))}
            </div>

            <div className="field" style={{ marginTop: '14px' }}>
              <label>{t.note}</label>
              <input type="text" maxLength="200" placeholder={t.notePh} value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <div className="plan-actions">
              <button className="btn-primary" onClick={saveWorkout} disabled={loading}>
                {loading ? t.saving : t.saveWorkout}
              </button>
              <button className="btn-ghost" onClick={resetWorkout}>{t.clear}</button>
            </div>
          </div>

          {historyExerciseNames.length > 0 && (
            <div className="card">
              <div className="card-title">{t.progressByExercise}</div>
              <div className="vezbi-grid">
                {historyExerciseNames.map(v => (
                  <button key={v} className={`vezba-btn ${chartVezba === v ? 'selected' : ''}`} onClick={() => loadChart(v)}>{v}</button>
                ))}
              </div>
              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="datum" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} unit="kg" />
                    <Tooltip formatter={(v) => [`${v} kg`, t.maxKg]} />
                    <Line type="monotone" dataKey="kg" stroke="#c8f060" strokeWidth={2} dot={{ fill: '#c8f060', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                chartVezba && <p className="muted center">{t.notEnough}</p>
              )}
            </div>
          )}

          <Collapsible title={t.history} count={Object.values(groupedHistory).flat().length}>
            {Object.keys(groupedHistory).length === 0 && (
              <p className="muted center">{t.noWorkouts}</p>
            )}
            {Object.entries(groupedHistory).map(([date, workouts]) => (
              <div key={date} className="history-group">
                <div className="history-date">{date}</div>
                {workouts.map(row => {
                  const session = parseWorkout(row)
                  return (
                    <div key={row.id} className="history-entry workout-history-entry">
                      <div className="history-main">
                        <div className="history-name">{session.name}</div>
                        <div className="history-meta">
                          <span className="set-badge">{session.type}</span>
                          <span className="set-badge">{session.exercises.length} {t.exercises}</span>
                          {row.max_kg > 0 && <span className="badge-green">{t.maxKg.toLowerCase()} {row.max_kg}kg</span>}
                        </div>
                        <div className="workout-history-exercises">
                          {session.exercises.map(ex => (
                            <div key={ex.id} className="workout-history-exercise">
                              <strong>{ex.naziv}</strong>
                              <span>
                                {ex.sets.map((s, i) => `${i + 1}: ${s.povtoruvanja}${Number(s.kg) > 0 ? ` × ${s.kg}kg` : ''}`).join(' · ')}
                              </span>
                            </div>
                          ))}
                        </div>
                        {row.beleshka && <div className="history-note">{row.beleshka}</div>}
                      </div>
                      <button className="btn-icon danger" onClick={() => deleteWorkout(row.id)}>✕</button>
                    </div>
                  )
                })}
              </div>
            ))}
          </Collapsible>
        </>
      )}
    </div>
  )
}

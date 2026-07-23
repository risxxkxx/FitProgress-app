import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell
} from 'recharts'

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay() || 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + 1 + offset * 7)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
    label: `${mon.getDate()}.${mon.getMonth()+1} — ${sun.getDate()}.${sun.getMonth()+1}`
  }
}

const COLORS = ['#c8f060', '#60d4f0', '#f06060', '#EF9F27', '#a060f0']

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
    return parsed.exercises.map((ex, index) => ({
      id: ex.id || `${row.id}-${index}`,
      naziv: ex.naziv || 'Вежба',
      grupa: ex.grupa || 'Друго',
      sets: normalizeSets(ex.sets || []),
      datum: row.datum,
    }))
  }

  const legacySets = Array.isArray(parsed) ? parsed : []
  return [{ id: `${row.id}-legacy`, naziv: row.naziv, grupa: 'Друго', sets: normalizeSets(legacySets), datum: row.datum }]
}

function exerciseMaxKg(exercise) {
  return Math.max(0, ...normalizeSets(exercise.sets).map(s => Number(s.kg) || 0))
}


export default function IzveshtajPage({ user, goals }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekData, setWeekData] = useState(null)
  const [weightChart, setWeightChart] = useState([])
  const [strukChart, setStrukChart] = useState([])
  const [monthChart, setMonthChart] = useState([])
  const [grupiChart, setGrupiChart] = useState([])
  const [vezbaChart, setVezbaChart] = useState([])
  const [selectedVezba, setSelectedVezba] = useState('')
  const [allVezbi, setAllVezbi] = useState([])
  const [loading, setLoading] = useState(true)

  const week = getWeekRange(weekOffset)
  const protGoal = goals?.prot_goal || goals?.protein || 150
  const kcalGoal = goals?.kcal_goal || goals?.dnevni_kalorii || goals?.kalorii || 2000
  const weightGoal = goals?.weight_goal || 74

  useEffect(() => { loadWeek() }, [weekOffset])
  useEffect(() => { loadCharts() }, [])

  async function loadWeek() {
    setLoading(true)
    const [{ data: tr }, { data: ob }, { data: mk }, { data: voda }] = await Promise.all([
      supabase.from('vezbi').select('datum, naziv, seriji, max_kg, total_volumen').eq('user_id', user.id).gte('datum', week.start).lte('datum', week.end),
      supabase.from('obroci').select('datum, kcal, proteini').eq('user_id', user.id).gte('datum', week.start).lte('datum', week.end),
      supabase.from('merki').select('datum, tezina').eq('user_id', user.id).gte('datum', week.start).lte('datum', week.end),
      supabase.from('voda').select('datum, chasi').eq('user_id', user.id).gte('datum', week.start).lte('datum', week.end),
    ])

    const treninzi = tr || []; const obroci = ob || []
    const merki = mk || []; const vodaList = voda || []
    const uniqueDeni = treninzi.length
    const totalProt = obroci.reduce((s, o) => s + (o.proteini||0), 0)
    const totalKcal = obroci.reduce((s, o) => s + (o.kcal||0), 0)
    const avgProt = obroci.length ? Math.round(totalProt / 7) : 0
    const avgKcal = obroci.length ? Math.round(totalKcal / 7) : 0
    const avgVoda = vodaList.length ? (vodaList.reduce((s,v)=>s+v.chasi,0)/vodaList.length).toFixed(1) : 0
    const lastTezina = merki.sort((a,b)=>b.datum.localeCompare(a.datum))[0]?.tezina || null

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(week.start); d.setDate(d.getDate() + i)
      const ds = d.toISOString().slice(0,10)
      const dayOb = obroci.filter(o => o.datum === ds)
      const dayTr = treninzi.filter(t => t.datum === ds)
      const dayV = vodaList.find(v => v.datum === ds)
      days.push({
        den: ['Пон','Вто','Сре','Чет','Пет','Саб','Нед'][i],
        kcal: dayOb.reduce((s,o)=>s+o.kcal,0),
        proteini: dayOb.reduce((s,o)=>s+o.proteini,0),
        treninzi: dayTr.length,
        voda: dayV?.chasi || 0,
        volumen: dayTr.reduce((s,t)=>s+(t.total_volumen||0),0),
      })
    }
    setWeekData({ uniqueDeni, avgProt, avgKcal, avgVoda, lastTezina, days, treninzi })
    setLoading(false)
  }

  async function loadCharts() {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d.toISOString().slice(0,10)
      const end = new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10)
      const label = d.toLocaleDateString('mk-MK', { month: 'short' })
      const { data: tr } = await supabase.from('vezbi').select('id').eq('user_id', user.id).gte('datum', start).lte('datum', end)
      const { data: ob } = await supabase.from('obroci').select('proteini, kcal').eq('user_id', user.id).gte('datum', start).lte('datum', end)
      const avgP = ob?.length ? Math.round(ob.reduce((s,o)=>s+(o.proteini||0),0)/30) : 0
      months.push({ mesec: label, treninzi: tr?.length || 0, proteini: avgP })
    }
    setMonthChart(months)

    // Тежина
    const { data: mkAll } = await supabase.from('merki').select('datum, tezina, struk').eq('user_id', user.id).order('datum').limit(30)
    setWeightChart(mkAll?.map(m => ({ datum: m.datum.slice(5), kg: m.tezina })) || [])
    setStrukChart(mkAll?.filter(m => m.struk).map(m => ({ datum: m.datum.slice(5), cm: m.struk })) || [])

    // Мускулни групи
    const { data: vezbiAll } = await supabase.from('vezbi').select('id, datum, naziv, seriji, max_kg').eq('user_id', user.id)
    const grupiMap = {
      'Горен дел': ['Склекови', 'Повлекување', 'Дипови', 'Muscle-up', 'Bench', 'Overhead', 'Пајк'],
      'Абдоминали': ['Планк', 'Кризови', 'L-sit', 'Dragon', 'Висење'],
      'Долен дел': ['Чучњеви', 'Лунџи', 'Пистол', 'Глутеус', 'Squat'],
      'Кардио': ['Трчање', 'Интервали', 'Спринт', 'Фартлек'],
      'Друго': [],
    }
    const allExercises = (vezbiAll || []).flatMap(parseWorkout)
    const counts = {}
    allExercises.forEach(v => {
      let found = false
      Object.entries(grupiMap).forEach(([grupa, kw]) => {
        if ((v.grupa === grupa) || kw.some(k => v.naziv.includes(k))) {
          counts[grupa] = (counts[grupa] || 0) + 1
          found = true
        }
      })
      if (!found) counts['Друго'] = (counts['Друго'] || 0) + 1
    })
    setGrupiChart(Object.entries(counts).filter(([,v])=>v>0).map(([name, value]) => ({ name, value })))

    // Листа на вежби за прогрес
    const unique = [...new Set(allExercises.filter(v=>v.naziv).map(v=>v.naziv) || [])]
    setAllVezbi(unique)
    if (unique.length > 0) loadVezbaChart(unique[0])
  }

  async function loadVezbaChart(naziv) {
    setSelectedVezba(naziv)
    const { data } = await supabase.from('vezbi').select('id, datum, naziv, seriji, max_kg').eq('user_id', user.id).order('datum').limit(200)
    const points = []
    ;(data || []).forEach(row => {
      const exercise = parseWorkout(row).find(ex => ex.naziv === naziv)
      if (!exercise) return
      const maxKg = exerciseMaxKg(exercise)
      if (maxKg > 0) points.push({ datum: row.datum.slice(5), kg: maxKg })
    })
    setVezbaChart(points.slice(-20))
  }

  return (
    <div className="page">
      <div className="page-header"><h1>Извештај</h1></div>

      {/* Week selector */}
      <div className="week-nav">
        <button className="btn-ghost small" onClick={() => setWeekOffset(w => w-1)}>← Претходна</button>
        <span className="week-nav-label">{weekOffset === 0 ? 'Оваа недела' : week.label}</span>
        <button className="btn-ghost small" onClick={() => setWeekOffset(w => w+1)} disabled={weekOffset >= 0}>Следна →</button>
      </div>

      {weekData && (
        <>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            <div className="stat-card"><div className="stat-val">{weekData.uniqueDeni}</div><div className="stat-label">тренинг-сесии</div></div>
            <div className="stat-card"><div className="stat-val">{weekData.lastTezina ? `${weekData.lastTezina}kg` : '—'}</div><div className="stat-label">тежина</div></div>
            <div className="stat-card"><div className="stat-val">{weekData.avgKcal}</div><div className="stat-label">просечни kcal/ден</div></div>
            <div className="stat-card"><div className="stat-val">{weekData.avgProt}g</div><div className="stat-label">просечни протеини/ден</div></div>
          </div>

          <div className="card">
            <div className="card-title">Калории по ден</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData.days}>
                <XAxis dataKey="den" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip formatter={v => [`${v} kcal`, 'Калории']} />
                <ReferenceLine y={kcalGoal} stroke="#c8f06060" strokeDasharray="4 4" />
                <Bar dataKey="kcal" fill="#c8f060" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title">Протеини по ден</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekData.days}>
                <XAxis dataKey="den" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} unit="g" />
                <Tooltip formatter={v => [`${v}g`, 'Протеини']} />
                <ReferenceLine y={protGoal} stroke="#60d4f060" strokeDasharray="4 4" />
                <Bar dataKey="proteini" fill="#60d4f0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title">Тренинг волумен по ден</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekData.days}>
                <XAxis dataKey="den" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip formatter={v => [`${v} kg`, 'Волумен']} />
                <Bar dataKey="volumen" fill="#a060f0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="card-title">Вода по ден</div>
            <div className="water-week-grid">
              {weekData.days.map((d, i) => (
                <div key={i} className="water-week-col">
                  <div className="water-week-bar-wrap">
                    <div className="water-week-bar" style={{ height: `${Math.min(100, (d.voda/10)*100)}%` }} />
                  </div>
                  <div className="water-week-label">{d.den}</div>
                  <div className="water-week-val">{d.voda}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Тежина низ време */}
      {weightChart.length > 1 && (
        <div className="card">
          <div className="card-title">Тежина низ време</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightChart}>
              <XAxis dataKey="datum" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} unit="kg" domain={['auto','auto']} />
              <Tooltip formatter={v => [`${v} kg`, 'Тежина']} />
              <ReferenceLine y={weightGoal} stroke="#c8f06060" strokeDasharray="4 4" label={{ value: 'Цел', fill: '#c8f060', fontSize: 10 }} />
              <Line type="monotone" dataKey="kg" stroke="#c8f060" strokeWidth={2} dot={{ fill: '#c8f060', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Струк низ време */}
      {strukChart.length > 1 && (
        <div className="card">
          <div className="card-title">Обем на струк низ време</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={strukChart}>
              <XAxis dataKey="datum" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} unit="cm" domain={['auto','auto']} />
              <Tooltip formatter={v => [`${v} cm`, 'Струк']} />
              <Line type="monotone" dataKey="cm" stroke="#60d4f0" strokeWidth={2} dot={{ fill: '#60d4f0', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Тренинзи по месец */}
      {monthChart.length > 0 && (
        <div className="card">
          <div className="card-title">Тренинзи по месец</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthChart}>
              <XAxis dataKey="mesec" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
              <Tooltip formatter={v => [v, 'Тренинзи']} />
              <Bar dataKey="treninzi" fill="#c8f060" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Мускулни групи */}
      {grupiChart.length > 0 && (
        <div className="card">
          <div className="card-title">Мускулни групи</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={grupiChart} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                  {grupiChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {grupiChart.map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text2)' }}>{g.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text)', marginLeft: 'auto' }}>{g.value}×</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Прогрес по вежба */}
      {allVezbi.length > 0 && (
        <div className="card">
          <div className="card-title">Прогрес по вежба</div>
          <div className="grupa-tabs" style={{ marginBottom: '12px' }}>
            {allVezbi.slice(0, 8).map(v => (
              <button key={v} className={`tab-pill ${selectedVezba === v ? 'active' : ''}`} onClick={() => loadVezbaChart(v)}>
                {v}
              </button>
            ))}
          </div>
          {vezbaChart.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={vezbaChart}>
                <XAxis dataKey="datum" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} unit="kg" />
                <Tooltip formatter={v => [`${v} kg`, 'Макс кг']} />
                <Line type="monotone" dataKey="kg" stroke="#c8f060" strokeWidth={2} dot={{ fill: '#c8f060', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted center">Нема доволно податоци за {selectedVezba}</p>
          )}
        </div>
      )}

      {/* Протеини по месец */}
      {monthChart.length > 0 && (
        <div className="card">
          <div className="card-title">Просечни протеини по месец</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthChart}>
              <XAxis dataKey="mesec" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} unit="g" />
              <Tooltip formatter={v => [`${v}g`, 'Просечни протеини/ден']} />
              <ReferenceLine y={protGoal} stroke="#60d4f060" strokeDasharray="4 4" />
              <Bar dataKey="proteini" fill="#60d4f0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import Collapsible from '../components/Collapsible'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { LIMITS, isInRange, optionalRangeError, rangeError, cleanText, toNumber, positiveNumberInput } from '../lib/validation'

const today = () => new Date().toISOString().slice(0, 10)

function calcBMI(tezina, visina) {
  if (!isInRange(tezina, LIMITS.weight.min, LIMITS.weight.max)) return null
  if (!isInRange(visina, LIMITS.height.min, LIMITS.height.max)) return null
  const h = toNumber(visina) / 100
  return (toNumber(tezina) / (h * h)).toFixed(1)
}

function bmiCategory(bmi, isEn) {
  if (bmi < 18.5) return { label: isEn ? 'Below normal range' : 'Поднормална тежина', color: '#60d4f0' }
  if (bmi < 25) return { label: isEn ? 'Normal range ✓' : 'Нормална тежина ✓', color: '#c8f060' }
  if (bmi < 30) return { label: isEn ? 'Above normal range' : 'Прекумерна тежина', color: '#EF9F27' }
  return { label: isEn ? 'High BMI range' : 'Висок BMI опсег', color: '#f06060' }
}

function idealWeight(visina) {
  if (!isInRange(visina, LIMITS.height.min, LIMITS.height.max)) return null
  const h = toNumber(visina) / 100
  return { min: (18.5 * h * h).toFixed(1), max: (24.9 * h * h).toFixed(1) }
}

export default function MerkiPage({ user }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [tezina, setTezina] = useState('')
  const [visina, setVisina] = useState('')
  const [datum, setDatum] = useState(today())
  const [struk, setStruk] = useState('')
  const [gradi, setGradi] = useState('')
  const [butovi, setButovi] = useState('')
  const [beleshka, setBeleshka] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [merki, setMerki] = useState([])
  const [profileVisina, setProfileVisina] = useState(null)
  const [savingVisina, setSavingVisina] = useState(false)

  const bmi = calcBMI(tezina || merki[0]?.tezina, visina || profileVisina)
  const bmiCat = bmi ? bmiCategory(Number(bmi), isEn) : null
  const ideal = idealWeight(visina || profileVisina)

  const t = {
    title: isEn ? 'Measurements and BMI' : 'Мерки и BMI',
    bmiCalc: isEn ? 'BMI calculator' : 'BMI калкулатор',
    height: isEn ? 'Height (cm)' : 'Висина (цм)',
    saved: isEn ? 'Saved' : 'Зачувано',
    save: isEn ? 'Save' : 'Зачувај',
    weight: isEn ? 'Weight (kg)' : 'Тежина (кг)',
    last: isEn ? 'Last' : 'Последна',
    ideal: isEn ? 'Reference BMI range weight' : 'Ориентациска тежина според BMI',
    noteBmi: isEn ? 'BMI does not account for age, sex or muscle mass. Use it only as a rough reference, not as a diagnosis.' : 'BMI не ги зема предвид годините, полот, ни мускулната маса. Користи го само како ориентација, не како точна мерка.',
    add: isEn ? 'Add measurements' : 'Додади мерки',
    date: isEn ? 'Date' : 'Датум',
    waist: isEn ? 'Waist (cm)' : 'Струк (цм)',
    chest: isEn ? 'Chest (cm)' : 'Гради (цм)',
    thighs: isEn ? 'Thighs (cm)' : 'Бутови (цм)',
    note: isEn ? 'Note' : 'Белешка',
    notePh: isEn ? 'e.g. morning, before breakfast' : 'пр. наутро, на гладно',
    saving: isEn ? 'Saving...' : 'Зачувување...',
    saveMeasurements: isEn ? 'Save measurements' : 'Зачувај мерки',
    weightProgress: isEn ? 'Weight progress' : 'Напредок на тежина',
    target: isEn ? 'Target' : 'Цел',
    history: isEn ? 'Measurement history' : 'Историја на мерки',
    empty: isEn ? 'No measurements yet.' : 'Нема мерки уште.',
    under: isEn ? 'Under' : 'Под',
    normal: isEn ? 'Normal' : 'Нормал.',
    above: isEn ? 'Above' : 'Прекум.',
    high: isEn ? 'High' : 'Висок',
    failed: isEn ? 'Could not save' : 'Не успеа зачувување',
  }

  useEffect(() => { loadMerki(); loadProfile() }, [])

  async function loadProfile() {
    const { data } = await supabase.from('profili').select('visina')
      .eq('user_id', user.id)
      .maybeSingle()
    if (isInRange(data?.visina, LIMITS.height.min, LIMITS.height.max)) setProfileVisina(toNumber(data.visina))
  }

  async function loadMerki() {
    const { data } = await supabase.from('merki').select('*').eq('user_id', user.id).order('datum', { ascending: false }).limit(30)
    setMerki((data || []).filter(m => isInRange(m.tezina, LIMITS.weight.min, LIMITS.weight.max)))
  }

  function validateBodyInputs() {
    const weightError = rangeError(t.weight, tezina, LIMITS.weight.min, LIMITS.weight.max, 'kg', isEn)
    if (weightError) return weightError
    const heightError = optionalRangeError(t.height, visina, LIMITS.height.min, LIMITS.height.max, 'cm', isEn)
    if (heightError) return heightError
    const waistError = optionalRangeError(t.waist, struk, LIMITS.bodyCm.min, LIMITS.bodyCm.max, 'cm', isEn)
    if (waistError) return waistError
    const chestError = optionalRangeError(t.chest, gradi, LIMITS.bodyCm.min, LIMITS.bodyCm.max, 'cm', isEn)
    if (chestError) return chestError
    const thighError = optionalRangeError(t.thighs, butovi, LIMITS.bodyCm.min, LIMITS.bodyCm.max, 'cm', isEn)
    if (thighError) return thighError
    if (beleshka.length > 200) return isEn ? 'The note can have up to 200 characters.' : 'Белешката може да има максимум 200 карактери.'
    return ''
  }

  async function saveVisina() {
    setSaveError('')
    const error = rangeError(t.height, visina, LIMITS.height.min, LIMITS.height.max, 'cm', isEn)
    if (error) {
      setSaveError(error)
      return
    }
    setSavingVisina(true)
    await supabase.from('profili').upsert({ user_id: user.id, visina: toNumber(visina) }, { onConflict: 'user_id' })
    setProfileVisina(toNumber(visina))
    setVisina('')
    setSavingVisina(false)
  }

  async function saveMerki() {
    const validationError = validateBodyInputs()
    if (validationError) {
      setSaveError(validationError)
      return
    }
    setLoading(true)
    setSaveError('')
    const bmiVal = calcBMI(tezina, visina || profileVisina)
    const { error } = await supabase.from('merki').insert({
      user_id: user.id,
      datum,
      tezina: toNumber(tezina),
      struk: struk ? toNumber(struk) : null,
      gradi: gradi ? toNumber(gradi) : null,
      butovi: butovi ? toNumber(butovi) : null,
      beleshka: cleanText(beleshka, 200),
      bmi: bmiVal ? toNumber(bmiVal) : null
    })
    if (!error) {
      setTezina(''); setStruk(''); setGradi(''); setButovi(''); setBeleshka('')
      loadMerki()
    } else {
      setSaveError(`${t.failed}: ${error.message}`)
    }
    setLoading(false)
  }

  async function deleteMerka(id) {
    await supabase.from('merki').delete().eq('id', id)
    loadMerki()
  }

  const chartData = [...merki].reverse().map(m => ({ datum: m.datum.slice(5), kg: m.tezina, bmi: m.bmi }))

  return (
    <div className="page">
      <div className="page-header"><h1>{t.title}</h1></div>

      <div className="card">
        <div className="card-title">{t.bmiCalc}</div>
        <div className="bmi-inputs">
          <div className="field">
            <label>{t.height}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" placeholder={profileVisina ? `${t.saved}: ${profileVisina}cm` : '178'} value={visina} onChange={e => setVisina(positiveNumberInput(e.target.value))} min={LIMITS.height.min} max={LIMITS.height.max} />
              <button className="btn-ghost small" onClick={saveVisina} disabled={savingVisina}>{savingVisina ? '...' : t.save}</button>
            </div>
          </div>
          <div className="field">
            <label>{t.weight}</label>
            <input type="number" placeholder={merki[0]?.tezina ? `${t.last}: ${merki[0].tezina}kg` : '79'} value={tezina} onChange={e => setTezina(positiveNumberInput(e.target.value))} step="0.1" min={LIMITS.weight.min} max={LIMITS.weight.max} />
          </div>
        </div>

        {bmi && bmiCat && (
          <div className="bmi-result">
            <div className="bmi-number" style={{ color: bmiCat.color }}>{bmi}</div>
            <div className="bmi-label" style={{ color: bmiCat.color }}>{bmiCat.label}</div>
            {ideal && <div className="bmi-ideal muted">{t.ideal}: {ideal.min}–{ideal.max} kg</div>}
            <div className="bmi-formula">
              BMI = kg ÷ m² · {tezina || merki[0]?.tezina} ÷ {((visina || profileVisina) / 100).toFixed(2)}² = <strong>{bmi}</strong>
            </div>
            <div className="bmi-age-note">⚠ {t.noteBmi}</div>
            <div className="bmi-scale">
              <div className="bmi-scale-bar">
                <div className="bmi-zone" style={{ background: '#60d4f0', flex: 1 }}><span>{'<'}18.5</span></div>
                <div className="bmi-zone" style={{ background: '#c8f060', flex: 1.3 }}><span>18.5–25</span></div>
                <div className="bmi-zone" style={{ background: '#EF9F27', flex: 1 }}><span>25–30</span></div>
                <div className="bmi-zone" style={{ background: '#f06060', flex: 1 }}><span>30+</span></div>
              </div>
              <div className="bmi-labels"><span>{t.under}</span><span>{t.normal}</span><span>{t.above}</span><span>{t.high}</span></div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">{t.add}</div>
        <div className="field">
          <label>{t.date}</label>
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} />
        </div>
        <div className="field">
          <label>{t.weight} *</label>
          <input type="number" placeholder="79.5" step="0.1" min={LIMITS.weight.min} max={LIMITS.weight.max} value={tezina} onChange={e => setTezina(positiveNumberInput(e.target.value))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div className="field">
            <label>{t.waist}</label>
            <input type="number" placeholder="85" min={LIMITS.bodyCm.min} max={LIMITS.bodyCm.max} value={struk} onChange={e => setStruk(positiveNumberInput(e.target.value))} />
          </div>
          <div className="field">
            <label>{t.chest}</label>
            <input type="number" placeholder="100" min={LIMITS.bodyCm.min} max={LIMITS.bodyCm.max} value={gradi} onChange={e => setGradi(positiveNumberInput(e.target.value))} />
          </div>
          <div className="field">
            <label>{t.thighs}</label>
            <input type="number" placeholder="58" min={LIMITS.bodyCm.min} max={LIMITS.bodyCm.max} value={butovi} onChange={e => setButovi(positiveNumberInput(e.target.value))} />
          </div>
        </div>
        <div className="field">
          <label>{t.note}</label>
          <input type="text" placeholder={t.notePh} maxLength="200" value={beleshka} onChange={e => setBeleshka(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={saveMerki} disabled={loading}>{loading ? t.saving : t.saveMeasurements}</button>
        {saveError && <p className="auth-error" style={{ marginTop: 10 }}>{saveError}</p>}
      </div>

      {chartData.length > 1 && (
        <div className="card">
          <div className="card-title">{t.weightProgress}</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="datum" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} unit="kg" domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => [`${v} kg`, t.weight]} />
              <ReferenceLine y={75} stroke="#c8f06040" strokeDasharray="4 4" label={{ value: t.target, fill: '#c8f060', fontSize: 11 }} />
              <Line type="monotone" dataKey="kg" stroke="#c8f060" strokeWidth={2} dot={{ fill: '#c8f060', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="muted small center">{t.target}: 72–75 kg</p>
        </div>
      )}

      <Collapsible title={t.history} count={merki.length}>
        {merki.length === 0 && <p className="muted center">{t.empty}</p>}
        {merki.map(m => (
          <div key={m.id} className="history-entry">
            <div className="history-main">
              <div className="history-name">{m.tezina} kg — {m.datum}</div>
              <div className="history-meta">
                {m.bmi && <span className="badge-green">BMI {m.bmi}</span>}
                {m.struk ? <span className="set-badge">{isEn ? 'Waist' : 'Струк'} {m.struk}cm</span> : null}
                {m.gradi ? <span className="set-badge">{isEn ? 'Chest' : 'Гради'} {m.gradi}cm</span> : null}
                {m.butovi ? <span className="set-badge">{isEn ? 'Thighs' : 'Бутови'} {m.butovi}cm</span> : null}
              </div>
              {m.beleshka && <div className="history-note">{m.beleshka}</div>}
            </div>
            <button className="btn-icon danger" onClick={() => deleteMerka(m.id)}>✕</button>
          </div>
        ))}
      </Collapsible>
    </div>
  )
}

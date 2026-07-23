import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import BarcodeScanner from '../components/BarcodeScanner'
import { lookupBarcode, scaleToGrams } from '../lib/foodApi'
import { listFoods, upsertBarcodeFood, saveManualFood, deleteFood } from '../lib/foodLibrary'
import Collapsible from '../components/Collapsible'
import { LIMITS, optionalRangeError, rangeError, cleanText, toNumber, clampNumber, positiveNumberInput, isInRange } from '../lib/validation'

const today = () => new Date().toISOString().slice(0, 10)

const OBROCI_TIPOVI = {
  mk: ['🌅 Доручек', '🥤 Шејк — Протеин', '🍽 Ручек', '🍎 Ужина', '🌙 Вечера', '💪 По тренинг'],
  en: ['🌅 Breakfast', '🥤 Protein shake', '🍽 Lunch', '🍎 Snack', '🌙 Dinner', '💪 Post-workout'],
}

const MEAL_IDEAS = [
  { type: 'protein', kcal: 360, p: 45, c: 12, f: 9, mk: 'Пилешко филе + зелена салата + грчки јогурт сос', en: 'Chicken breast + green salad + Greek yogurt sauce' },
  { type: 'protein', kcal: 310, p: 38, c: 8, f: 11, mk: 'Туна салата со јајце и краставица', en: 'Tuna salad with egg and cucumber' },
  { type: 'protein', kcal: 280, p: 35, c: 10, f: 7, mk: 'Омлет од белки + урда + спанаќ', en: 'Egg-white omelet + cottage cheese + spinach' },
  { type: 'protein', kcal: 420, p: 42, c: 25, f: 12, mk: 'Мисиркино месо + зеленчук + малку ориз', en: 'Turkey + vegetables + small rice portion' },
  { type: 'healthy', kcal: 480, p: 28, c: 52, f: 16, mk: 'Лосос + компир + салата', en: 'Salmon + potato + salad' },
  { type: 'healthy', kcal: 390, p: 26, c: 38, f: 13, mk: 'Грчки јогурт + овес + бобинки', en: 'Greek yogurt + oats + berries' },
  { type: 'healthy', kcal: 430, p: 31, c: 45, f: 12, mk: 'Пилешко burrito bowl со зеленчук', en: 'Chicken burrito bowl with vegetables' },
  { type: 'healthy', kcal: 350, p: 24, c: 30, f: 14, mk: 'Урда + домати + интегрално лепче', en: 'Cottage cheese + tomatoes + wholegrain toast' },
]

export default function IshranePage({ user, goals }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const types = OBROCI_TIPOVI[lang]
  const [tip, setTip] = useState(types[0])
  const [jadenje, setJadenje] = useState('')
  const [kcal, setKcal] = useState('')
  const [proteini, setProteini] = useState('')
  const [jaglehidrati, setJaglehidrati] = useState('')
  const [masti, setMasti] = useState('')
  const [datum, setDatum] = useState(today())
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [rememberFood, setRememberFood] = useState(false)
  const [obroci, setObroci] = useState([])
  const [ideaFilter, setIdeaFilter] = useState('protein')

  // Мои намирници (библиотека за брзо логирање)
  const [library, setLibrary] = useState([])
  const [libraryBusyId, setLibraryBusyId] = useState(null)

  // Бар-код скенер
  const [showScanner, setShowScanner] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanProduct, setScanProduct] = useState(null) // { name, brand, per100g, barcode }
  const [scanGrams, setScanGrams] = useState(100)

  const protGoal = goals?.prot_goal || goals?.protein || 150
  const kcalGoal = goals?.kcal_goal || goals?.dnevni_kalorii || goals?.kalorii || 2000

  useEffect(() => { loadObroci(); loadLibrary() }, [])
  useEffect(() => { setTip(OBROCI_TIPOVI[lang][0]) }, [lang])

  async function loadLibrary() {
    try { setLibrary(await listFoods(user.id)) } catch { /* табелата можеби сè уште не постои — тивко игнорирај */ }
  }

  async function loadObroci() {
    const { data } = await supabase.from('obroci').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(60)
    setObroci((data || []).filter(o =>
      isInRange(o.kcal ?? 0, LIMITS.calories.min, LIMITS.calories.max) &&
      isInRange(o.proteini ?? 0, LIMITS.macroGrams.min, LIMITS.macroGrams.max) &&
      isInRange(o.jaglehidrati ?? 0, LIMITS.macroGrams.min, LIMITS.macroGrams.max) &&
      isInRange(o.masti ?? 0, LIMITS.macroGrams.min, LIMITS.macroGrams.max)
    ))
  }

  function validateMealInputs() {
    if (!cleanText(jadenje, 80)) return isEn ? 'Enter the meal.' : 'Внеси го јадењето!'
    if (cleanText(jadenje, 80).length < jadenje.trim().length) return isEn ? 'Meal name is too long.' : 'Името на оброкот е предолго.'
    const kcalError = optionalRangeError('kcal', kcal, LIMITS.calories.min, LIMITS.calories.max, 'kcal', isEn)
    if (kcalError) return kcalError
    const proteinError = optionalRangeError(isEn ? 'Protein' : 'Протеини', proteini, LIMITS.macroGrams.min, LIMITS.macroGrams.max, 'g', isEn)
    if (proteinError) return proteinError
    const carbError = optionalRangeError(isEn ? 'Carbs' : 'Јаглехидрати', jaglehidrati, LIMITS.macroGrams.min, LIMITS.macroGrams.max, 'g', isEn)
    if (carbError) return carbError
    const fatError = optionalRangeError(isEn ? 'Fat' : 'Масти', masti, LIMITS.macroGrams.min, LIMITS.macroGrams.max, 'g', isEn)
    if (fatError) return fatError
    return ''
  }

  async function addObrok() {
    const validationError = validateMealInputs()
    if (validationError) {
      setSaveError(validationError)
      return
    }
    setLoading(true)
    setSaveError('')
    const payload = { user_id: user.id, tip, jadenje: cleanText(jadenje, 80), kcal: kcal ? toNumber(kcal) : 0, proteini: proteini ? toNumber(proteini) : 0, datum }
    let { error } = await supabase.from('obroci').insert({ ...payload, jaglehidrati: jaglehidrati ? toNumber(jaglehidrati) : 0, masti: masti ? toNumber(masti) : 0 })
    if (error) {
      // Ако колоните jaglehidrati/masti сè уште не постојат во базата (пред да се примени SQL patch-от), fallback без нив
      const retry = await supabase.from('obroci').insert(payload)
      error = retry.error
    }
    if (error) {
      setSaveError(isEn ? `Could not save the meal: ${error.message}` : `Не успеа зачувување на оброкот: ${error.message}`)
      setLoading(false)
      return
    }
    if (rememberFood && jadenje) {
      try {
        await saveManualFood(user.id, { naziv: cleanText(jadenje, 80), kcal: kcal ? toNumber(kcal) : 0, proteini: proteini ? toNumber(proteini) : 0, jaglehidrati: jaglehidrati ? toNumber(jaglehidrati) : 0, masti: masti ? toNumber(masti) : 0 })
        loadLibrary()
      } catch { /* не е критично ако ова не успее */ }
    }
    setJadenje(''); setKcal(''); setProteini(''); setJaglehidrati(''); setMasti(''); setRememberFood(false)
    await loadObroci()
    setLoading(false)
  }

  function openScanner() {
    setScanError('')
    setScanProduct(null)
    setShowScanner(true)
  }

  async function handleBarcodeDetected(code) {
    setShowScanner(false)
    setScanLoading(true)
    setScanError('')
    try {
      const product = await lookupBarcode(code)
      if (!product) {
        setScanError(isEn ? `No product found for barcode ${code}. Try manual entry.` : `Не најден производ за бар-код ${code}. Внеси рачно.`)
      } else {
        setScanProduct(product)
        setScanGrams(100)
      }
    } catch {
      setScanError(isEn ? 'Could not reach the food database. Check your connection.' : 'Не успеа поврзување со базата на храна. Провери интернет врска.')
    }
    setScanLoading(false)
  }

  async function applyScannedProduct() {
    if (!scanProduct) return
    const gramsError = rangeError(isEn ? 'Grams' : 'Грамажа', scanGrams, 1, 3000, 'g', isEn)
    if (gramsError) {
      setScanError(gramsError)
      return
    }
    setScanLoading(true)
    setScanError('')
    const safeGrams = Math.round(clampNumber(scanGrams, 1, 3000, 100))
    const vals = scaleToGrams(scanProduct.per100g, safeGrams)
    const label = [scanProduct.brand, scanProduct.name].filter(Boolean).join(' — ') || scanProduct.name
    const payload = { user_id: user.id, tip, jadenje: `${label} (${safeGrams}g)`, kcal: vals.kcal, proteini: vals.proteini, datum }

    let { error } = await supabase.from('obroci').insert({ ...payload, jaglehidrati: vals.jaglehidrati, masti: vals.masti })
    if (error) {
      const retry = await supabase.from('obroci').insert(payload)
      error = retry.error
    }
    if (error) {
      setScanError(isEn ? `Could not save the meal: ${error.message}` : `Не успеа зачувување на оброкот: ${error.message}`)
      setScanLoading(false)
      return
    }

    try { await upsertBarcodeFood(user.id, scanProduct); loadLibrary() } catch { /* не е критично */ }

    setScanProduct(null)
    setScanLoading(false)
    await loadObroci()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function addFromLibrary(item) {
    setLibraryBusyId(item.id)
    setSaveError('')
    const vals = item.per_100g ? scaleToGrams(item, 100) : { kcal: item.kcal, proteini: item.proteini, jaglehidrati: item.jaglehidrati, masti: item.masti }
    const payload = { user_id: user.id, tip, jadenje: item.per_100g ? `${item.naziv} (100g)` : item.naziv, kcal: vals.kcal, proteini: vals.proteini, datum }
    let { error } = await supabase.from('obroci').insert({ ...payload, jaglehidrati: vals.jaglehidrati, masti: vals.masti })
    if (error) {
      const retry = await supabase.from('obroci').insert(payload)
      error = retry.error
    }
    if (error) setSaveError(isEn ? `Could not save the meal: ${error.message}` : `Не успеа зачувување на оброкот: ${error.message}`)
    else await loadObroci()
    setLibraryBusyId(null)
  }

  async function removeFromLibrary(id, e) {
    e.stopPropagation()
    setLibrary(prev => prev.filter(f => f.id !== id))
    try { await deleteFood(id) } catch { loadLibrary() }
  }

  async function applyIdea(idea) {
    setLoading(true)
    setSaveError('')
    const payload = { user_id: user.id, tip, jadenje: idea[lang], kcal: idea.kcal, proteini: idea.p, datum }
    let { error } = await supabase.from('obroci').insert({ ...payload, jaglehidrati: idea.c || 0, masti: idea.f || 0 })
    if (error) {
      const retry = await supabase.from('obroci').insert(payload)
      error = retry.error
    }
    if (error) {
      setSaveError(isEn ? `Could not save the meal: ${error.message}` : `Не успеа зачувување на оброкот: ${error.message}`)
      setLoading(false)
      return
    }
    await loadObroci()
    setLoading(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteObrok(id) {
    await supabase.from('obroci').delete().eq('id', id)
    loadObroci()
  }

  const todayObroci = obroci.filter(o => o.datum === today())
  const totalKcal = todayObroci.reduce((s, o) => s + (o.kcal || 0), 0)
  const totalProt = todayObroci.reduce((s, o) => s + (o.proteini || 0), 0)
  const protPct = Math.min(100, Math.round((totalProt / protGoal) * 100))
  const kcalPct = Math.min(100, Math.round((totalKcal / kcalGoal) * 100))
  const prevObroci = obroci.filter(o => o.datum !== today())

  const t = {
    title: isEn ? 'Nutrition' : 'Исхрана',
    proteinToday: isEn ? 'protein today' : 'протеини денес', kcalToday: isEn ? 'kcal today' : 'kcal денес', mealsToday: isEn ? 'meals today' : 'оброци денес',
    macros: isEn ? 'Today macros' : 'Макроси денес', protein: isEn ? 'Protein' : 'Протеини', calories: isEn ? 'Calories' : 'Калории', addMeal: isEn ? 'Add meal' : 'Додади оброк', type: isEn ? 'Type' : 'Тип', meal: isEn ? 'Meal' : 'Јадење', date: isEn ? 'Date' : 'Датум', save: isEn ? 'Save meal' : 'Додади оброк', saving: isEn ? 'Saving...' : 'Зачувување...',
    inspire: isEn ? 'Get inspired' : 'Инспирирај се', inspireText: isEn ? 'Quick meal ideas you can copy into your daily log.' : 'Брзи идеи за оброци што можеш веднаш да ги внесеш.', low: isEn ? 'High protein / low carb & fat' : 'Протеински / low carbs & fats', healthy: isEn ? 'Healthy balanced meals' : 'Други здрави оброци', use: isEn ? 'Use this meal' : 'Искористи оброк',
    today: isEn ? 'Meals today' : 'Оброци денес', none: isEn ? 'No meals today.' : 'Нема оброци денес.', prev: isEn ? 'Previous meals' : 'Претходни оброци'
  }

  return (
    <div className="page page-wide">
      <div className="page-header"><h1>{t.title}</h1></div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-val">{totalProt}g</div><div className="stat-label">{t.proteinToday}</div></div>
        <div className="stat-card"><div className="stat-val">{totalKcal}</div><div className="stat-label">{t.kcalToday}</div></div>
        <div className="stat-card"><div className="stat-val">{todayObroci.length}</div><div className="stat-label">{t.mealsToday}</div></div>
      </div>

      <div className="card">
        <div className="card-title">{t.macros}</div>
        <div className="macro-row"><span className="macro-lbl">{t.protein} <strong style={{ color: 'var(--accent)' }}>{totalProt}g</strong> / {protGoal}g</span><div className="macro-track"><div className="macro-fill green" style={{ width: protPct + '%' }} /></div></div>
        <div className="macro-row"><span className="macro-lbl">{t.calories} <strong style={{ color: 'var(--accent2)' }}>{totalKcal}</strong> / {kcalGoal} kcal</span><div className="macro-track"><div className="macro-fill blue" style={{ width: kcalPct + '%' }} /></div></div>
      </div>

      <div className="nutrition-layout">
        <div className="card">
          <div className="card-title">{t.addMeal}</div>

          <button className="btn-ghost scan-btn" onClick={openScanner} disabled={scanLoading}>
            {scanLoading ? (isEn ? 'Looking up product...' : 'Пребарувам производ...') : `📷 ${isEn ? 'Scan barcode' : 'Скенирај бар-код'}`}
          </button>
          {scanError && <p className="auth-error" style={{ marginTop: 8 }}>{scanError}</p>}

          {scanProduct && (
            <div className="scan-result-card">
              <div className="history-name">{[scanProduct.brand, scanProduct.name].filter(Boolean).join(' — ') || (isEn ? 'Unnamed product' : 'Производ без име')}</div>
              <div className="field" style={{ marginTop: 8 }}>
                <label>{isEn ? 'Amount (g)' : 'Количина (g)'}</label>
                <input type="number" min="1" max="3000" value={scanGrams} onChange={e => setScanGrams(positiveNumberInput(e.target.value))} />
              </div>
              <div className="history-meta" style={{ marginBottom: 10 }}>
                {(() => { const v = scaleToGrams(scanProduct.per100g, scanGrams); return (
                  <>
                    <span className="set-badge">{v.kcal} kcal</span>
                    <span className="badge-green">{v.proteini}g P</span>
                    <span className="set-badge">{v.jaglehidrati}g C</span>
                    <span className="set-badge">{v.masti}g F</span>
                  </>
                )})()}
              </div>
              <button className="btn-primary" onClick={applyScannedProduct} disabled={scanLoading}>
                {scanLoading ? t.saving : (isEn ? 'Save meal' : 'Зачувај оброк')}
              </button>
            </div>
          )}

          {library.length > 0 && (
            <div className="food-library">
              <div className="eyebrow" style={{ marginBottom: 6 }}>📚 {isEn ? 'My foods — tap to log' : 'Мои намирници — тапни за да логираш'}</div>
              <div className="food-library-list">
                {library.map(item => (
                  <button key={item.id} className="food-pill" onClick={() => addFromLibrary(item)} disabled={libraryBusyId === item.id}>
                    <span>{item.naziv}{item.per_100g ? ' · 100g' : ''}</span>
                    <span className="food-pill-x" onClick={e => removeFromLibrary(item.id, e)}>✕</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {saveError && <p className="auth-error">{saveError}</p>}

          <div className="field"><label>{t.type}</label><select value={tip} onChange={e => setTip(e.target.value)}>{types.map(x => <option key={x}>{x}</option>)}</select></div>
          <div className="field"><label>{t.meal} *</label><input type="text" maxLength="80" placeholder={isEn ? 'e.g. Grilled chicken + salad' : 'пр. Пилешко на скара + салата'} value={jadenje} onChange={e => setJadenje(e.target.value)} /></div>
          <div className="nutrition-input-grid">
            <div className="field"><label>kcal</label><input type="number" placeholder="450" min={LIMITS.calories.min} max={LIMITS.calories.max} value={kcal} onChange={e => setKcal(positiveNumberInput(e.target.value))} /></div>
            <div className="field"><label>{t.protein} (g)</label><input type="number" placeholder="35" min={LIMITS.macroGrams.min} max={LIMITS.macroGrams.max} value={proteini} onChange={e => setProteini(positiveNumberInput(e.target.value))} /></div>
            <div className="field"><label>{isEn ? 'Carbs (g)' : 'Јаглехидрати (g)'}</label><input type="number" placeholder="40" min={LIMITS.macroGrams.min} max={LIMITS.macroGrams.max} value={jaglehidrati} onChange={e => setJaglehidrati(positiveNumberInput(e.target.value))} /></div>
            <div className="field"><label>{isEn ? 'Fat (g)' : 'Масти (g)'}</label><input type="number" placeholder="15" min={LIMITS.macroGrams.min} max={LIMITS.macroGrams.max} value={masti} onChange={e => setMasti(positiveNumberInput(e.target.value))} /></div>
            <div className="field"><label>{t.date}</label><input type="date" value={datum} onChange={e => setDatum(e.target.value)} /></div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={rememberFood} onChange={e => setRememberFood(e.target.checked)} />
            <span>{isEn ? 'Remember this food for quick logging next time' : 'Зачувај ја оваа храна за побрзо логирање следен пат'}</span>
          </label>
          <button className="btn-primary" onClick={addObrok} disabled={loading}>{loading ? t.saving : t.save}</button>
        </div>

        {showScanner && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setShowScanner(false)} />}

        <div className="card inspire-card">
          <div className="card-title">{t.inspire}</div>
          <p className="muted small">{t.inspireText}</p>
          <div className="filter-bar compact">
            <button className={`tab-pill ${ideaFilter === 'protein' ? 'active' : ''}`} onClick={() => setIdeaFilter('protein')}>{t.low}</button>
            <button className={`tab-pill ${ideaFilter === 'healthy' ? 'active' : ''}`} onClick={() => setIdeaFilter('healthy')}>{t.healthy}</button>
          </div>
          {MEAL_IDEAS.filter(i => i.type === ideaFilter).map(idea => (
            <div key={idea.mk} className="meal-idea">
              <div>
                <div className="history-name">{idea[lang]}</div>
                <div className="history-meta">
                  <span className="set-badge">{idea.kcal} kcal</span>
                  <span className="badge-green">{idea.p}g P</span>
                  <span className="set-badge">{idea.c}g C</span>
                  <span className="set-badge">{idea.f}g F</span>
                </div>
              </div>
              <button className="btn-ghost small" onClick={() => applyIdea(idea)} disabled={loading}>{t.use}</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">{t.today}</div>
        {todayObroci.length === 0 && <p className="muted center">{t.none}</p>}
        {todayObroci.map(o => <MealRow key={o.id} meal={o} onDelete={deleteObrok} />)}
      </div>

      {prevObroci.length > 0 && (
        <Collapsible title={t.prev} count={prevObroci.length}>
          {prevObroci.slice(0, 15).map(o => <MealRow key={o.id} meal={o} onDelete={deleteObrok} showDate />)}
        </Collapsible>
      )}
    </div>
  )
}

function MealRow({ meal, onDelete, showDate = false }) {
  return (
    <div className="history-entry">
      {showDate && <div className="entry-date-badge">{meal.datum}</div>}
      <div className="history-main">
        <div className="history-name">{meal.tip} — {meal.jadenje}</div>
        <div className="history-meta">
          {meal.kcal > 0 && <span className="set-badge">{meal.kcal} kcal</span>}
          {meal.proteini > 0 && <span className="badge-green">{meal.proteini}g protein</span>}
          {meal.jaglehidrati > 0 && <span className="set-badge">{meal.jaglehidrati}g C</span>}
          {meal.masti > 0 && <span className="set-badge">{meal.masti}g F</span>}
        </div>
      </div>
      <button className="btn-icon danger" onClick={() => onDelete(meal.id)}>✕</button>
    </div>
  )
}

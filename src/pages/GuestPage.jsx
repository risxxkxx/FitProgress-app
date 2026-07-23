import { useState } from 'react'
import BottomNav from '../components/BottomNav'
import PlanoviPage from './PlanoviPage'
import { useLanguage } from '../lib/LanguageContext'

const DEMO_MEALS = [
  { mk: 'Грчки јогурт + овес + бобинки', en: 'Greek yogurt + oats + berries', meta: '390 kcal · 26g protein' },
  { mk: 'Пилешко филе + салата + јогурт сос', en: 'Chicken breast + salad + yogurt sauce', meta: '360 kcal · 45g protein' },
  { mk: 'Туна салата со јајце и краставица', en: 'Tuna salad with egg and cucumber', meta: '310 kcal · 38g protein' },
]

export default function GuestPage({ onBackHome, onLogin, onRegister }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [page, setPage] = useState('dashboard')
  const [note, setNote] = useState('')
  const [showAccountHint, setShowAccountHint] = useState(false)

  const t = {
    guest: isEn ? 'Demo version' : 'Демо верзија',
    guestText: isEn
      ? 'Explore the app with sample data. Nothing personal is saved in demo mode.'
      : 'Разгледај ја апликацијата со пример податоци. Во демо режим ништо лично не се зачувува.',
    back: isEn ? 'Back to home' : 'Назад на почетна',
    login: isEn ? 'Log in' : 'Најави се',
    register: isEn ? 'Create account to save progress' : 'Направи акаунт за зачувување',
  }

  return (
    <div className="app guest-app">
      <div className="page-wrap">
        <div className="guest-topbar">
          <div>
            <div className="eyebrow">{t.guest}</div>
            <strong>{t.guestText}</strong>
          </div>
          <div className="guest-actions">
            <button className="btn-ghost small" onClick={onBackHome}>{t.back}</button>
            <button className="btn-ghost small" onClick={onLogin}>{t.login}</button>
            <button className="btn-primary guest-primary" onClick={onRegister}>{t.register}</button>
          </div>
        </div>

        {showAccountHint && (
          <div className="page page-wide" style={{ paddingBottom: 0 }}>
            <div className="auth-success guest-hint">
              {isEn
                ? 'Nice, you can preview this in demo mode. Create an account when you want to keep your progress.'
                : 'Супер, ова можеш да го разгледаш во демо режим. Направи акаунт кога ќе сакаш да го зачуваш прогресот.'}
              <button className="btn-icon" onClick={() => setShowAccountHint(false)}>✕</button>
            </div>
          </div>
        )}

        {page === 'dashboard' && <GuestDashboard onRegister={onRegister} />}
        {page === 'planovi' && <PlanoviPage user={null} onRequireAccount={() => setShowAccountHint(true)} />}
        {page === 'ishrana' && <GuestNutrition />}
        {page === 'settings' && <GuestNotes note={note} setNote={setNote} onRegister={onRegister} />}
        {['vezbi', 'merki', 'izveshtaj', 'leaderboard'].includes(page) && <LockedFeature page={page} onRegister={onRegister} />}
      </div>
      <BottomNav active={page} onChange={setPage} />
    </div>
  )
}

function GuestDashboard({ onRegister }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>{isEn ? 'Fit Progress demo' : 'Fit Progress демо'} 👋</h1>
        <p className="muted">
          {isEn
            ? 'Preview the tracker before creating an account. This demo does not save personal progress.'
            : 'Прегледај го tracker-от пред да направиш акаунт. Ова демо не зачувува личен прогрес.'}
        </p>
      </div>

      <div className="stats-grid guest-stats">
        <div className="stat-card"><div className="stat-val">3</div><div className="stat-label">{isEn ? 'demo workouts' : 'демо тренинзи'}</div></div>
        <div className="stat-card"><div className="stat-val">8/10</div><div className="stat-label">{isEn ? 'water goal' : 'вода цел'}</div></div>
        <div className="stat-card"><div className="stat-val">6</div><div className="stat-label">{isEn ? 'plans' : 'планови'}</div></div>
      </div>

      <div className="guest-grid">
        <div className="card">
          <div className="card-title">{isEn ? 'What you can preview' : 'Што можеш да разгледаш'}</div>
          <div className="guest-check">✓ {isEn ? 'Home and gym beginner plans' : 'Почетнички планови за дома и теретана'}</div>
          <div className="guest-check">✓ {isEn ? 'Nutrition ideas and water tracking concept' : 'Идеи за исхрана и концепт за вода'}</div>
          <div className="guest-check">✓ {isEn ? 'Notes preview without saving' : 'Преглед на забелешки без зачувување'}</div>
          <div className="guest-check muted">🔒 {isEn ? 'Personal progress requires an account' : 'Личен прогрес бара акаунт'}</div>
        </div>

        <div className="card guest-cta-card">
          <div className="card-title">{isEn ? 'Save your progress later' : 'Зачувај го прогресот подоцна'}</div>
          <p className="muted small">
            {isEn
              ? 'Demo mode is only for preview. When you want to save workouts, meals, measurements and reports, create an account.'
              : 'Демо режимот е само за преглед. Кога ќе сакаш да зачуваш тренинзи, оброци, мерки и извештаи, направи акаунт.'}
          </p>
          <button className="btn-primary" onClick={onRegister}>{isEn ? 'Create free account' : 'Направи бесплатен акаунт'}</button>
        </div>
      </div>
    </div>
  )
}

function GuestNutrition() {
  const { lang } = useLanguage()
  const isEn = lang === 'en'

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>{isEn ? 'Nutrition preview' : 'Исхрана преглед'}</h1>
        <p className="muted">
          {isEn
            ? 'Preview meal ideas without creating an account. Saving meals is available after sign up.'
            : 'Разгледај идеи за оброци без акаунт. Зачувување оброци е достапно по регистрација.'}
        </p>
      </div>

      <div className="nutrition-layout">
        <div className="card">
          <div className="card-title">{isEn ? 'Meal ideas' : 'Идеи за оброци'}</div>
          {DEMO_MEALS.map(meal => (
            <div className="meal-idea" key={meal.en}>
              <div>
                <strong>{isEn ? meal.en : meal.mk}</strong>
                <p className="muted small" style={{ marginTop: 4 }}>{meal.meta}</p>
              </div>
              <span className="set-badge">Demo</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">{isEn ? 'How it works after sign up' : 'Како работи по регистрација'}</div>
          <div className="guest-check">✓ {isEn ? 'Add meals for each day' : 'Додаваш оброци за секој ден'}</div>
          <div className="guest-check">✓ {isEn ? 'Track calories and protein' : 'Следиш калории и протеин'}</div>
          <div className="guest-check">✓ {isEn ? 'Save your own food library' : 'Зачувуваш своја листа на намирници'}</div>
        </div>
      </div>
    </div>
  )
}

function GuestNotes({ note, setNote, onRegister }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>{isEn ? 'Notes and feedback' : 'Забелешки и feedback'}</h1>
        <p className="muted">
          {isEn
            ? 'Write a note while previewing. It disappears when you refresh or leave demo mode.'
            : 'Запиши забелешка додека разгледуваш. Ќе исчезне кога ќе освежиш или излезеш од демо режим.'}
        </p>
      </div>

      <div className="card">
        <div className="field">
          <label>{isEn ? 'Your note' : 'Твоја забелешка'}</label>
          <textarea
            rows={7}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isEn ? 'Example: the login button was confusing, I would add...' : 'Пример: копчето за најава беше збунувачко, би додал/а...'}
          />
        </div>
        <p className="muted small">
          {isEn
            ? 'Nothing from demo mode is saved to your account or database.'
            : 'Ништо од демо режимот не се зачувува во акаунт или база.'}
        </p>
        <button className="btn-primary" onClick={onRegister}>{isEn ? 'Create account' : 'Направи акаунт'}</button>
      </div>
    </div>
  )
}

function LockedFeature({ page, onRegister }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const names = {
    vezbi: isEn ? 'workout tracking' : 'следење тренинзи',
    merki: isEn ? 'body measurements' : 'телесни мерки',
    izveshtaj: isEn ? 'reports' : 'извештаи',
    leaderboard: isEn ? 'leaderboard' : 'листа',
  }

  return (
    <div className="page page-wide">
      <div className="locked-card card">
        <div className="locked-icon">🔒</div>
        <div className="card-title">{isEn ? 'Account needed' : 'Потребен е акаунт'}</div>
        <p className="muted">
          {isEn
            ? `This part uses personal data, so ${names[page]} is available after sign up.`
            : `Овој дел користи лични податоци, затоа ${names[page]} е достапно по регистрација.`}
        </p>
        <button className="btn-primary" onClick={onRegister}>{isEn ? 'Create free account' : 'Направи бесплатен акаунт'}</button>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { isStandalone } from '../lib/push'

function detectPlatform() {
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  if (isIOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

export default function InstallGuideCard() {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [tab, setTab] = useState(detectPlatform() === 'other' ? 'android' : detectPlatform())
  const installed = useMemo(() => isStandalone(), [])

  const t = {
    title: isEn ? 'Install on your phone' : 'Инсталирај на телефон',
    already: isEn ? "✓ You're already using the installed app — nice!" : '✓ Веќе ја користиш инсталираната апликација — супер!',
    why: isEn
      ? 'Installing adds an app icon to your home screen, makes it open full-screen, and (on iPhone) is required for notifications to work.'
      : 'Инсталирањето додава икона на почетен екран, апликацијата се отвора цело-екрански, и (на iPhone) е задолжително за да работат известувањата.',
    ios: isEn ? 'iPhone' : 'iPhone',
    android: isEn ? 'Android' : 'Android',
  }

  const iosSteps = isEn
    ? ['Open this site in Safari (not Chrome).', 'Tap the Share icon (square with an arrow) in the bottom bar.', "Scroll down and tap 'Add to Home Screen'.", "Tap 'Add' in the top right corner.", 'Open the app from the new icon on your Home Screen.']
    : ['Отвори ја страницата во Safari (не Chrome).', 'Тапни на иконата „Сподели“ (квадрат со стрелка) на дното.', "Скролај надолу и тапни „Add to Home Screen“ (Додади на почетен екран).", "Тапни „Add“ (Додади) горе десно.", 'Отвори ја апликацијата од новата икона на почетниот екран.']

  const androidSteps = isEn
    ? ['Open this site in Chrome.', "Tap the ⋮ menu in the top right corner.", "Tap 'Install app' or 'Add to Home screen'.", "Confirm by tapping 'Install'.", 'Open the app from the new icon.']
    : ['Отвори ја страницата во Chrome.', 'Тапни на менито ⋮ горе десно.', "Тапни „Install app“ или „Add to Home screen“ (Инсталирај / Додади на почетен екран).", "Потврди со „Install“ (Инсталирај).", 'Отвори ја апликацијата од новата икона.']

  const steps = tab === 'ios' ? iosSteps : androidSteps

  return (
    <div className="card">
      <div className="card-title">📲 {t.title}</div>

      {installed ? (
        <p className="auth-success">{t.already}</p>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>{t.why}</p>
          <div className="filter-bar compact" style={{ marginBottom: 12 }}>
            <button className={`tab-pill ${tab === 'android' ? 'active' : ''}`} onClick={() => setTab('android')}>🤖 {t.android}</button>
            <button className={`tab-pill ${tab === 'ios' ? 'active' : ''}`} onClick={() => setTab('ios')}>🍎 {t.ios}</button>
          </div>
          <ol className="install-steps">
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </>
      )}
    </div>
  )
}

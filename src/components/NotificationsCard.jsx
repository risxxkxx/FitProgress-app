import { useEffect, useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'
import { pushSupported, notificationPermission, isStandalone, isPushEnabled, enablePushNotifications, disablePushNotifications } from '../lib/push'

export default function NotificationsCard({ user }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [supported, setSupported] = useState(true)
  const [standalone, setStandalone] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [permission, setPermission] = useState('default')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { init() }, [])

  async function init() {
    const sup = pushSupported()
    setSupported(sup)
    setStandalone(isStandalone())
    setPermission(notificationPermission())
    if (sup) setEnabled(await isPushEnabled())
  }

  async function toggle() {
    setMessage('')
    setLoading(true)
    try {
      if (enabled) {
        await disablePushNotifications()
        setEnabled(false)
      } else {
        await enablePushNotifications(user.id)
        setEnabled(true)
      }
    } catch (e) {
      if (e.message === 'permission-denied') {
        setMessage(isEn ? 'Notification permission was denied. Enable it in your browser/phone settings.' : 'Дозволата за нотификации е одбиена. Овозможи ја во поставките на прелистувачот/телефонот.')
      } else if (e.message === 'missing-vapid-key') {
        setMessage(isEn ? 'Push notifications are not configured yet on this deployment.' : 'Push нотификациите сè уште не се конфигурирани на овој deployment.')
      } else {
        setMessage(isEn ? 'Something went wrong enabling notifications.' : 'Нешто тргна наопаку при вклучувањето нотификации.')
      }
    }
    setPermission(notificationPermission())
    setLoading(false)
  }

  const t = {
    title: isEn ? 'Notifications' : 'Известувања',
    desc: isEn ? 'Get reminders for workouts, water and supplements.' : 'Добивај потсетници за тренинг, вода и суплементи.',
    enable: isEn ? 'Enable notifications' : 'Вклучи известувања',
    disable: isEn ? 'Disable notifications' : 'Исклучи известувања',
    unsupported: isEn ? 'Notifications are not supported in this browser.' : 'Овој прелистувач не поддржува известувања.',
    needsInstall: isEn
      ? "On iPhone, notifications only work after you add this app to your Home Screen (see the guide below). Open the installed app icon first, then come back here."
      : 'На iPhone, известувањата работат само откако апликацијата е додадена на почетен екран (види го водичот подолу). Прво отвори ја инсталираната икона, потоа врати се овде.',
    blocked: isEn ? 'Notifications are blocked for this site in your browser settings.' : 'Известувањата се блокирани за оваа страница во поставките на прелистувачот.',
  }

  return (
    <div className="card">
      <div className="card-title">🔔 {t.title}</div>
      <p className="muted" style={{ marginBottom: 12 }}>{t.desc}</p>

      {!supported && <p className="auth-error">{t.unsupported}</p>}
      {supported && !standalone && <p className="auth-error">{t.needsInstall}</p>}
      {supported && permission === 'denied' && <p className="auth-error">{t.blocked}</p>}
      {message && <p className="auth-error">{message}</p>}

      {supported && (
        <button
          className={enabled ? 'btn-danger-full' : 'btn-primary'}
          onClick={toggle}
          disabled={loading || permission === 'denied'}
        >
          {loading ? (isEn ? 'Please wait...' : 'Почекај...') : enabled ? t.disable : t.enable}
        </button>
      )}
    </div>
  )
}

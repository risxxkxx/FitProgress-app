import { useEffect, useState } from 'react'

export default function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    // Install prompt
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // SW update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setUpdateReady(true)
      })
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
  }

  function dismiss() {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (updateReady) return (
    <div className="pwa-banner update">
      <span>🔄 Нова верзија е достапна</span>
      <button onClick={() => window.location.reload()}>Освежи</button>
    </div>
  )

  if (!showBanner) return null

  return (
    <div className="pwa-banner install">
      <div className="pwa-banner-text">
        <strong>Инсталирај ја апликацијата</strong>
        <span>Додај на почетен екран за брз пристап</span>
      </div>
      <div className="pwa-banner-btns">
        <button className="pwa-btn-install" onClick={install}>Инсталирај</button>
        <button className="pwa-btn-dismiss" onClick={dismiss}>✕</button>
      </div>
    </div>
  )
}

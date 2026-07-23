import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../lib/LanguageContext'

// Камера-скенер за бар-код (EAN/UPC на прехранбени производи), базиран на @zxing/browser.
// onDetected(code) се повикува штом успешно се прочита бар-код.
// onClose() ја затвора модалната прозорче.
export default function BarcodeScanner({ onDetected, onClose }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | scanning | error | denied
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result, err, ctrls) => {
            if (cancelled) return
            controlsRef.current = ctrls
            if (result) {
              ctrls.stop()
              onDetected(result.getText())
            }
          }
        )
        if (cancelled) { controls.stop(); return }
        controlsRef.current = controls
        setStatus('scanning')
      } catch (e) {
        if (!cancelled) setStatus(e?.name === 'NotAllowedError' ? 'denied' : 'error')
      }
    }

    start()
    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [])

  function submitManual() {
    const code = manualCode.trim()
    if (code) onDetected(code)
  }

  const t = {
    title: isEn ? 'Scan barcode' : 'Скенирај бар-код',
    hint: isEn ? 'Point the camera at the barcode on the package' : 'Насочи ја камерата кон бар-кодот на пакувањето',
    denied: isEn ? "Camera access was denied. You can allow it in your browser settings, or enter the barcode manually below." : 'Пристапот до камерата е одбиен. Дозволи го во поставките на прелистувачот, или внеси го бар-кодот рачно подолу.',
    error: isEn ? "Camera couldn't start. You can enter the barcode manually below." : 'Камерата не можеше да се стартува. Внеси го бар-кодот рачно подолу.',
    manualLabel: isEn ? 'Enter barcode manually' : 'Внеси бар-код рачно',
    manualPlaceholder: isEn ? 'e.g. 5942012345678' : 'пр. 5942012345678',
    use: isEn ? 'Search' : 'Пребарај',
    close: isEn ? 'Cancel' : 'Откажи',
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box scanner-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="card-title" style={{ marginBottom: 0 }}>{t.title}</div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {(status === 'starting' || status === 'scanning') && (
          <>
            <div className="scanner-video-wrap">
              <video ref={videoRef} className="scanner-video" muted playsInline />
              <div className="scanner-frame" />
            </div>
            <p className="muted small center">{t.hint}</p>
          </>
        )}

        {(status === 'denied' || status === 'error') && (
          <p className="auth-error">{status === 'denied' ? t.denied : t.error}</p>
        )}

        <div className="scanner-manual">
          <div className="field">
            <label>{t.manualLabel}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={t.manualPlaceholder}
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitManual()}
            />
          </div>
          <button className="btn-ghost" onClick={submitManual}>{t.use}</button>
        </div>

        <button className="btn-danger-full" style={{ marginTop: 10 }} onClick={onClose}>{t.close}</button>
      </div>
    </div>
  )
}

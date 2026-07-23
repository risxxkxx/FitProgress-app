import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import { cleanText } from '../lib/validation'

const CATEGORIES = [
  { id: 'bug', mk: '🐞 Проблем / грешка', en: '🐞 Bug / issue' },
  { id: 'idea', mk: '💡 Идеја / предлог', en: '💡 Idea / suggestion' },
  { id: 'other', mk: '💬 Друго', en: '💬 Other' },
]

export default function FeedbackButton({ user, page }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [open, setOpen] = useState(false)
  const [kategorija, setKategorija] = useState('bug')
  const [poraka, setPoraka] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function submit() {
    const cleanMessage = cleanText(poraka, 1000)
    if (!cleanMessage || cleanMessage.length < 3) {
      setError(isEn ? 'Write at least 3 characters.' : 'Напиши барем 3 карактери.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id, email: user.email, kategorija, poraka: cleanMessage, stranica: page,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
    setPoraka('')
    setTimeout(() => { setSent(false); setOpen(false) }, 1500)
  }

  return (
    <>
      <button className="feedback-fab" onClick={() => setOpen(true)} title={isEn ? 'Send feedback' : 'Испрати забелешка'}>
        📝
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="card-title" style={{ marginBottom: 0 }}>{isEn ? 'Send feedback' : 'Испрати забелешка'}</div>
              <button className="btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            {sent ? (
              <p className="auth-success">{isEn ? '✓ Thank you! Your note was sent.' : '✓ Благодарам! Забелешката е испратена.'}</p>
            ) : (
              <>
                <div className="field">
                  <label>{isEn ? 'Type' : 'Тип'}</label>
                  <select value={kategorija} onChange={e => setKategorija(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{isEn ? c.en : c.mk}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>{isEn ? 'Your note' : 'Твojaта забелешка'}</label>
                  <textarea
                    rows={4}
                    placeholder={isEn ? 'What happened, or what would you like to see?' : 'Што се случи, или што би сакал/а да видиш?'}
                    value={poraka}
                    maxLength={1000}
                    onChange={e => setPoraka(e.target.value)}
                  />
                </div>
                {error && <p className="auth-error">{error}</p>}
                <button className="btn-primary" onClick={submit} disabled={loading || !poraka.trim()}>
                  {loading ? (isEn ? 'Sending...' : 'Испраќам...') : (isEn ? 'Send' : 'Испрати')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

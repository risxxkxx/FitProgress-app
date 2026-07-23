import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const today = () => new Date().toISOString().slice(0, 10)

function RatingPicker({ value, onChange, color }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: '36px', height: '36px', borderRadius: '8px',
            border: `1.5px solid ${n <= value ? color : 'var(--border)'}`,
            background: n <= value ? color + '22' : 'var(--bg3)',
            color: n <= value ? color : 'var(--text3)',
            fontSize: '14px', fontWeight: '500', cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.15s',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export default function WellnessCard({ user }) {
  const [son, setSon] = useState(0)
  const [energija, setEnergija] = useState(0)
  const [apetit, setApetit] = useState(0)
  const [beleshka, setBeleshka] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => { loadWellness() }, [])

  async function loadWellness() {
    const { data } = await supabase.from('wellness').select('*').eq('user_id', user.id).eq('datum', today()).maybeSingle()
    if (data) {
      setSon(data.son || 0)
      setEnergija(data.energija || 0)
      setApetit(data.apetit || 0)
      setBeleshka(data.beleshka || '')
      if (data.son || data.energija || data.apetit) setExpanded(true)
    }
  }

  async function save() {
    setSaving(true)
    await supabase.from('wellness').upsert({
      user_id: user.id, datum: today(),
      son, energija, apetit, beleshka
    }, { onConflict: 'user_id,datum' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sonLabel = ['—', '😴 Лош', '😕 Слаб', '😐 Среден', '😊 Добар', '🌟 Одличен'][son] || '—'
  const energijaLabel = ['—', '🪫 Исцрпен', '😓 Уморен', '😐 Нормален', '⚡ Енергичен', '🔥 Полн енергија'][energija] || '—'
  const apetitLabel = ['—', '🤢 Без апетит', '😕 Слаб', '😐 Нормален', '😋 Добар', '🍽 Одличен'][apetit] || '—'

  return (
    <div className="card">
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: expanded ? '14px' : '0' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="card-title" style={{ marginBottom: 0 }}>Wellness денес</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(son > 0 || energija > 0 || apetit > 0) && (
            <div style={{ display: 'flex', gap: '4px' }}>
              {son > 0 && <span style={{ fontSize: '11px', background: '#1a2e10', color: 'var(--accent)', padding: '2px 8px', borderRadius: '100px' }}>Сон {son}/5</span>}
              {energija > 0 && <span style={{ fontSize: '11px', background: '#0f2030', color: 'var(--accent2)', padding: '2px 8px', borderRadius: '100px' }}>E {energija}/5</span>}
            </div>
          )}
          <span style={{ fontSize: '18px', color: 'var(--text3)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Сон · <span style={{ color: 'var(--accent)' }}>{sonLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RatingPicker value={son} onChange={setSon} color="#c8f060" />
              <input
                type="number" min="0" max="12" placeholder="часови"
                value={son === 0 ? '' : son}
                onChange={e => setSon(Math.min(12, Math.max(0, +e.target.value)))}
                style={{ width: '80px', padding: '8px 10px', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Енергија · <span style={{ color: 'var(--accent2)' }}>{energijaLabel}</span>
            </div>
            <RatingPicker value={energija} onChange={setEnergija} color="#60d4f0" />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Апетит · <span style={{ color: '#EF9F27' }}>{apetitLabel}</span>
            </div>
            <RatingPicker value={apetit} onChange={setApetit} color="#EF9F27" />
          </div>

          <div className="field">
            <label>Белешка (опционално)</label>
            <input type="text" placeholder="пр. слабо спиев, стрес на работа..." value={beleshka} onChange={e => setBeleshka(e.target.value)} />
          </div>

          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Зачувување...' : saved ? '✓ Зачувано!' : 'Зачувај wellness'}
          </button>
        </>
      )}
    </div>
  )
}

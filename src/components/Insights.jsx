import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Insights({ user }) {
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadInsights() }, [])

  async function loadInsights() {
    const now = new Date()
    const day28 = new Date(now); day28.setDate(now.getDate() - 28)
    const day7 = new Date(now); day7.setDate(now.getDate() - 7)
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1)

    const [
      { data: merki },
      { data: vezbi },
      { data: vezbiPrev },
      { data: obroci },
    ] = await Promise.all([
      supabase.from('merki').select('datum, tezina, struk').eq('user_id', user.id).gte('datum', day28.toISOString().slice(0,10)).order('datum'),
      supabase.from('vezbi').select('datum, naziv, max_kg').eq('user_id', user.id).gte('datum', weekStart.toISOString().slice(0,10)),
      supabase.from('vezbi').select('datum, naziv, max_kg').eq('user_id', user.id).gte('datum', day28.toISOString().slice(0,10)),
      supabase.from('obroci').select('datum, proteini').eq('user_id', user.id).gte('datum', day7.toISOString().slice(0,10)),
    ])

    const result = []

    // Промена на тежина
    if (merki && merki.length >= 2) {
      const first = merki[0].tezina
      const last = merki[merki.length - 1].tezina
      const diff = +(last - first).toFixed(1)
      if (Math.abs(diff) >= 0.3) {
        result.push({
          icon: diff < 0 ? '📉' : '📈',
          type: diff < 0 ? 'success' : 'warning',
          text: diff < 0
            ? `Тежината се намалила за ${Math.abs(diff)} kg во последните 4 недели`
            : `Тежината се зголемила за ${diff} kg во последните 4 недели`
        })
      }
    }

    // Промена на струк
    if (merki && merki.length >= 2) {
      const withStruk = merki.filter(m => m.struk)
      if (withStruk.length >= 2) {
        const first = withStruk[0].struk
        const last = withStruk[withStruk.length - 1].struk
        const diff = +(last - first).toFixed(1)
        if (Math.abs(diff) >= 0.5) {
          result.push({
            icon: diff < 0 ? '✂️' : '📏',
            type: diff < 0 ? 'success' : 'neutral',
            text: diff < 0
              ? `Струкот се намалил за ${Math.abs(diff)} cm во последните 4 недели`
              : `Струкот се зголемил за ${diff} cm`
          })
        }
      }
    }

    // Тренинзи оваа недела
    if (vezbi) {
      const uniqueDays = [...new Set(vezbi.map(v => v.datum))].length
      if (uniqueDays > 0) {
        result.push({
          icon: '💪',
          type: uniqueDays >= 3 ? 'success' : 'neutral',
          text: uniqueDays >= 3
            ? `Одлично! ${uniqueDays} тренинзи оваа недела`
            : `${uniqueDays} тренинг${uniqueDays > 1 ? 'и' : ''} оваа недела — додај уште!`
        })
      }
    }

    // Прогрес по вежба
    if (vezbiPrev && vezbiPrev.length > 0) {
      const byVezba = {}
      vezbiPrev.forEach(v => {
        if (!byVezba[v.naziv]) byVezba[v.naziv] = []
        byVezba[v.naziv].push({ datum: v.datum, kg: v.max_kg })
      })
      let bestProgress = null
      Object.entries(byVezba).forEach(([naziv, entries]) => {
        if (entries.length < 2 || !entries[0].kg) return
        entries.sort((a, b) => a.datum.localeCompare(b.datum))
        const first = entries[0].kg
        const last = entries[entries.length - 1].kg
        if (first > 0 && last > first) {
          const pct = Math.round(((last - first) / first) * 100)
          if (!bestProgress || pct > bestProgress.pct) {
            bestProgress = { naziv, pct, first, last }
          }
        }
      })
      if (bestProgress) {
        result.push({
          icon: '🏋️',
          type: 'success',
          text: `${bestProgress.naziv}: +${bestProgress.pct}% килажа (${bestProgress.first}→${bestProgress.last} kg)`
        })
      }
    }

    // Најчесто тренирана мускулна група
    if (vezbiPrev && vezbiPrev.length > 0) {
      const grupiMap = {
        'Горен дел': ['Склекови', 'Повлекување', 'Дипови', 'Muscle-up', 'Bench', 'Overhead', 'Пајк'],
        'Абдоминали': ['Планк', 'Кризови', 'L-sit', 'Dragon', 'Висење'],
        'Долен дел': ['Чучњеви', 'Лунџи', 'Пистол', 'Глутеус', 'Squat'],
        'Кардио': ['Трчање', 'Интервали', 'Спринт', 'Фартлек'],
      }
      const counts = {}
      vezbiPrev.forEach(v => {
        Object.entries(grupiMap).forEach(([grupa, kw]) => {
          if (kw.some(k => v.naziv.includes(k))) counts[grupa] = (counts[grupa] || 0) + 1
        })
      })
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
      if (sorted.length >= 2) {
        result.push({
          icon: '📊',
          type: 'neutral',
          text: `Најмногу тренираш ${sorted[0][0]} (${sorted[0][1]}×), најмалку ${sorted[sorted.length-1][0]} (${sorted[sorted.length-1][1]}×)`
        })
      }
    }

    // Просечни протеини
    if (obroci && obroci.length > 0) {
      const days = [...new Set(obroci.map(o => o.datum))].length
      const avg = Math.round(obroci.reduce((s, o) => s + (o.proteini || 0), 0) / days)
      if (avg > 0) {
        result.push({
          icon: avg >= 120 ? '✅' : '⚠️',
          type: avg >= 120 ? 'success' : 'warning',
          text: avg >= 120
            ? `Просечно ${avg}g протеини/ден оваа недела — одлично!`
            : `Просечно само ${avg}g протеини/ден — зголеми го внесот!`
        })
      }
    }

    setInsights(result)
    setLoading(false)
  }

  if (loading || !insights.length) return null

  return (
    <div className="card">
      <div className="card-title">Увиди</div>
      {insights.map((ins, i) => (
        <div key={i} className={`insight-row insight-${ins.type}`}>
          <span className="insight-icon">{ins.icon}</span>
          <span className="insight-text">{ins.text}</span>
        </div>
      ))}
    </div>
  )
}

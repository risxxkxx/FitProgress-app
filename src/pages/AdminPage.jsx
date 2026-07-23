import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import Collapsible from '../components/Collapsible'

const ADMIN_EMAILS = ['agencynula@gmail.com']

export function isAdminUser(user) {
  return ADMIN_EMAILS.includes(user?.email?.toLowerCase())
}

function subscriptionStatus(row) {
  return row?.payment_status || row?.status || row?.plan || 'free'
}

function accountStatus(row) {
  if (row?.is_blocked) return 'blocked'
  return row?.status || 'active'
}

export default function AdminPage({ user }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState([])
  const [activity, setActivity] = useState({ workouts: 0, meals: 0, measurements: 0, water: 0 })
  const [payments, setPayments] = useState({ paid: 0, trial: 0, free: 0, blocked: 0 })
  const [alerts, setAlerts] = useState([])
  const [feedback, setFeedback] = useState([])
  const [demoStats, setDemoStats] = useState({ total: 0, today: 0, recent: [] })
  const [search, setSearch] = useState('')
  const [adminLog, setAdminLog] = useState('')

  useEffect(() => { loadAdminData() }, [lang])

  async function safeSelect(table, query = '*') {
    try {
      const { data, error } = await supabase.from(table).select(query)
      if (error) throw error
      return data || []
    } catch (error) {
      console.warn(`Admin table/read issue: ${table}`, error.message)
      return []
    }
  }

  async function loadAdminData() {
    setLoading(true)
    const [profili, vezbi, obroci, ishrana, merki, voda, subscriptions, statusRows, alarms, feedbackRows, demoEvents] = await Promise.all([
      safeSelect('profili', '*'),
      safeSelect('vezbi', 'id,user_id,created_at'),
      safeSelect('obroci', 'id,user_id,created_at'),
      safeSelect('ishrana', 'id,user_id,created_at'),
      safeSelect('merki', 'id,user_id,created_at'),
      safeSelect('voda', 'id,user_id,chasi'),
      safeSelect('subscriptions', '*'),
      safeSelect('account_status', '*'),
      safeSelect('app_alarms', '*'),
      safeSelect('feedback', '*'),
      safeSelect('demo_analytics', '*'),
    ])
    setFeedback(feedbackRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))

    const sortedDemoEvents = demoEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const todayKey = new Date().toISOString().slice(0, 10)
    setDemoStats({
      total: demoEvents.filter(e => e.event_name === 'view_demo_click').length,
      today: demoEvents.filter(e => e.event_name === 'view_demo_click' && e.created_at?.slice(0, 10) === todayKey).length,
      recent: sortedDemoEvents.slice(0, 8),
    })

    const statusByUser = Object.fromEntries(statusRows.map(s => [s.user_id, s]))
    const subByUser = Object.fromEntries(subscriptions.map(s => [s.user_id, s]))
    const merged = profili.map(p => {
      const st = statusByUser[p.user_id]
      const sub = subByUser[p.user_id]
      return {
        ...p,
        status: accountStatus(st),
        subscription: subscriptionStatus(sub),
        isPaid: Boolean(sub?.is_paid) || subscriptionStatus(sub) === 'paid',
      }
    })

    const allMeals = [...obroci, ...ishrana]
    setProfiles(merged)
    setActivity({ workouts: vezbi.length, meals: allMeals.length, measurements: merki.length, water: voda.reduce((sum, row) => sum + (row.chasi || 0), 0) })
    setPayments({
      paid: merged.filter(p => p.subscription === 'paid' || p.isPaid).length,
      trial: merged.filter(p => p.subscription === 'trial').length,
      free: merged.filter(p => !['paid', 'trial'].includes(p.subscription)).length,
      blocked: merged.filter(p => p.status === 'blocked').length,
    })

    const computedAlerts = []
    if (profili.length === 0) computedAlerts.push(isEn ? 'No users found yet.' : 'Сè уште нема корисници.')
    if (vezbi.length === 0) computedAlerts.push(isEn ? 'No workout activity logged.' : 'Нема внесена активност за тренинг.')
    if (merged.some(p => p.status === 'blocked')) computedAlerts.push(isEn ? 'There are blocked accounts.' : 'Има блокирани акаунти.')
    if (merged.filter(p => p.subscription === 'paid' || p.isPaid).length === 0) computedAlerts.push(isEn ? 'No paid users yet. Payment field is ready for future integration.' : 'Сè уште нема платени корисници. Полето е подготвено за идно поврзување со плаќање.')
    alarms.filter(a => !(a.resolved || a.is_resolved)).forEach(a => computedAlerts.push(a.title || a.message || a.type))
    setAlerts(computedAlerts)
    setLoading(false)
  }

  async function toggleResolved(id, current) {
    await supabase.from('feedback').update({ resolved: !current }).eq('id', id)
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, resolved: !current } : f))
  }

  async function deleteFeedback(id) {
    setFeedback(prev => prev.filter(f => f.id !== id))
    await supabase.from('feedback').delete().eq('id', id)
  }

  async function setAccountStatus(userId, nextStatus) {
    setAdminLog('')
    const isBlocked = nextStatus === 'blocked'
    const payloadFull = { user_id: userId, status: nextStatus, is_blocked: isBlocked, updated_by: user.id, updated_at: new Date().toISOString() }
    let { error } = await supabase.from('account_status').upsert(payloadFull, { onConflict: 'user_id' })
    if (error) {
      const fallback = { user_id: userId, status: nextStatus, updated_by: user.id, updated_at: new Date().toISOString() }
      const res = await supabase.from('account_status').upsert(fallback, { onConflict: 'user_id' })
      error = res.error
    }
    setAdminLog(error ? error.message : isBlocked ? (isEn ? 'Account blocked in app.' : 'Акаунтот е блокиран во апликацијата.') : (isEn ? 'Account unblocked.' : 'Акаунтот е одблокиран.'))
    loadAdminData()
  }

  async function markPayment(userId, status) {
    setAdminLog('')
    const payloadFull = { user_id: userId, status, payment_status: status, is_paid: status === 'paid', updated_at: new Date().toISOString() }
    let { error } = await supabase.from('subscriptions').upsert(payloadFull, { onConflict: 'user_id' })
    if (error) {
      const res = await supabase.from('subscriptions').upsert({ user_id: userId, status, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      error = res.error
    }
    setAdminLog(error ? error.message : (isEn ? 'Subscription status updated.' : 'Статусот за плаќање е ажуриран.'))
    loadAdminData()
  }

  async function requestPasswordReset(email) {
    if (!email) return
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    setAdminLog(error ? error.message : (isEn ? 'Password reset email requested.' : 'Побарано е reset password email.'))
  }

  async function deleteUserData(userId) {
    if (!confirm(isEn ? 'Delete this user app data? Auth user deletion needs a Supabase Edge Function/service role.' : 'Да се избришат податоците од апликацијата за овој корисник? Бришење на auth user бара Supabase Edge Function/service role.')) return
    setAdminLog('')
    for (const table of ['vezbi', 'obroci', 'ishrana', 'merki', 'voda', 'goals', 'custom_vezbi', 'hidden_vezbi', 'nedelen_plan', 'suplementi', 'suplementi_lista', 'subscriptions', 'account_status']) {
      try { await supabase.from(table).delete().eq('user_id', userId) } catch {}
    }
    setAdminLog(isEn ? 'User app data deleted. Auth account remains until server-side delete is connected.' : 'Податоците од апликацијата се избришани. Auth акаунтот останува додека не се поврзе server-side delete.')
    loadAdminData()
  }

  const filteredProfiles = useMemo(() => profiles.filter(p => {
    const q = search.toLowerCase()
    return !q || p.user_id?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.full_name?.toLowerCase().includes(q) || p.ime?.toLowerCase().includes(q) || p.prezime?.toLowerCase().includes(q)
  }), [profiles, search])

  const t = {
    title: isEn ? 'Admin overview' : 'Админ преглед',
    subtitle: isEn ? 'Owner dashboard for users, activity, alarms and future monetization.' : 'Сопственички dashboard за корисници, активност, аларми и идна монетизација.',
    users: isEn ? 'Users' : 'Корисници', paid: isEn ? 'Paid users' : 'Платени', trial: 'Trial', blocked: isEn ? 'Blocked' : 'Блокирани', demoClicks: isEn ? 'Demo clicks' : 'Демо кликови', demoToday: isEn ? 'today' : 'денес', activity: isEn ? 'Activity' : 'Активност', alerts: isEn ? 'Alarms / checks' : 'Аларми / проверки', accounts: isEn ? 'Account control' : 'Контрола на акаунти', search: isEn ? 'Search user ID, name or email' : 'Пребарај user ID, име или email', block: isEn ? 'Block' : 'Блокирај', unblock: isEn ? 'Unblock' : 'Одблокирај', reset: isEn ? 'Reset password' : 'Reset password', del: isEn ? 'Delete app data' : 'Избриши app податоци', free: 'Free', refresh: isEn ? 'Refresh' : 'Освежи', logout: isEn ? 'Log out' : 'Одјави се'
  }

  if (loading) return <div className="page"><p className="muted center">{isEn ? 'Loading admin data...' : 'Се вчитуваат админ податоци...'}</p></div>

  return (
    <div className="page page-wide admin-page">
      <div className="page-header admin-header">
        <div>
          <h1>{t.title}</h1>
          <p className="muted">{t.subtitle}</p>
        </div>
        <div className="admin-actions">
          <button className="btn-ghost" onClick={loadAdminData}>{t.refresh}</button>
          <button className="btn-danger-outline" onClick={() => supabase.auth.signOut()}>{t.logout}</button>
        </div>
      </div>

      <div className="stats-grid admin-stats">
        <div className="stat-card"><div className="stat-val">{profiles.length}</div><div className="stat-label">{t.users}</div></div>
        <div className="stat-card"><div className="stat-val">{payments.paid}</div><div className="stat-label">{t.paid}</div></div>
        <div className="stat-card"><div className="stat-val">{payments.trial}</div><div className="stat-label">{t.trial}</div></div>
        <div className="stat-card"><div className="stat-val">{payments.blocked}</div><div className="stat-label">{t.blocked}</div></div>
        <div className="stat-card"><div className="stat-val">{demoStats.total}</div><div className="stat-label">{t.demoClicks} · {demoStats.today} {t.demoToday}</div></div>
      </div>

      <div className="admin-grid">
        <div className="card">
          <div className="card-title">{t.activity}</div>
          <div className="admin-kpi"><span>💪 Workouts</span><strong>{activity.workouts}</strong></div>
          <div className="admin-kpi"><span>🥗 Meals</span><strong>{activity.meals}</strong></div>
          <div className="admin-kpi"><span>📏 Measurements</span><strong>{activity.measurements}</strong></div>
          <div className="admin-kpi"><span>💧 Water cups</span><strong>{activity.water}</strong></div>
        </div>
        <div className="card">
          <div className="card-title">{t.alerts}</div>
          {alerts.length === 0 ? <p className="muted">{isEn ? 'No alarms right now.' : 'Нема аларми во моментот.'}</p> : alerts.map((a, index) => <div key={`${a}-${index}`} className="alert-row">⚠️ {a}</div>)}
          <p className="muted small" style={{ marginTop: 12 }}>{isEn ? 'Suggested future alarms: failed payments, inactive paid users, error logs, suspicious signups and churn risk.' : 'Идни аларми: неуспешни плаќања, неактивни платени корисници, error logs, сомнителни регистрации и ризик за откажување.'}</p>
        </div>
      </div>

      {adminLog && <div className="auth-success">{adminLog}</div>}

      <Collapsible title={isEn ? '👀 Demo analytics' : '👀 Демо аналитика'} count={demoStats.total} defaultOpen={demoStats.total > 0}>
        {demoStats.recent.length === 0 && <p className="muted center">{isEn ? 'No demo clicks yet. Run the SQL patch if this stays empty after testing.' : 'Сè уште нема демо кликови. Ако остане празно по тест, пушти го SQL patch-от.'}</p>}
        {demoStats.recent.map(event => (
          <div key={event.id} className="history-entry">
            <div className="history-main">
              <div className="history-name">👀 {event.event_name === 'view_demo_click' ? (isEn ? 'View demo clicked' : 'Клик на Види демо верзија') : event.event_name}</div>
              <div className="history-meta">
                <span className="set-badge">{event.source || 'landing'}</span>
                {event.language && <span className="set-badge">{event.language}</span>}
                <span className="set-badge">{new Date(event.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </Collapsible>

      <Collapsible title={isEn ? '📝 Tester feedback' : '📝 Забелешки од тестери'} count={feedback.filter(f => !f.resolved).length} defaultOpen={feedback.some(f => !f.resolved)}>
        {feedback.length === 0 && <p className="muted center">{isEn ? 'No feedback yet.' : 'Сè уште нема забелешки.'}</p>}
        {feedback.map(f => (
          <div key={f.id} className="history-entry" style={{ opacity: f.resolved ? 0.5 : 1 }}>
            <div className="history-main">
              <div className="history-name">
                {f.kategorija === 'bug' ? '🐞' : f.kategorija === 'idea' ? '💡' : '💬'} {f.email || f.user_id?.slice(0, 8)}
              </div>
              <div className="history-meta">
                {f.stranica && <span className="set-badge">{f.stranica}</span>}
                <span className="set-badge">{new Date(f.created_at).toLocaleString()}</span>
              </div>
              <div className="history-note">{f.poraka}</div>
            </div>
            <div className="admin-actions">
              <button className="btn-ghost small" onClick={() => toggleResolved(f.id, f.resolved)}>
                {f.resolved ? (isEn ? 'Reopen' : 'Отвори пак') : (isEn ? 'Resolve' : 'Решено')}
              </button>
              <button className="btn-icon danger" onClick={() => deleteFeedback(f.id)}>✕</button>
            </div>
          </div>
        ))}
      </Collapsible>

      <div className="card">
        <div className="card-title">{t.accounts}</div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={{ marginBottom: 12 }} />
        <div className="admin-table">
          {filteredProfiles.map(profile => (
            <div key={profile.user_id} className="admin-user-row">
              <div className="admin-user-main">
                <strong>{profile.full_name || [profile.ime, profile.prezime].filter(Boolean).join(' ') || profile.email || profile.user_id.slice(0, 8)}</strong>
                <span>{profile.email || profile.user_id}</span>
                <div className="history-meta"><span className="set-badge">{profile.status}</span><span className="badge-green">{profile.subscription}</span></div>
              </div>
              <div className="admin-actions">
                <button className="btn-ghost small" onClick={() => markPayment(profile.user_id, 'paid')}>{t.paid}</button>
                <button className="btn-ghost small" onClick={() => markPayment(profile.user_id, 'trial')}>{t.trial}</button>
                <button className="btn-ghost small" onClick={() => markPayment(profile.user_id, 'free')}>{t.free}</button>
                {profile.status === 'blocked'
                  ? <button className="btn-ghost small" onClick={() => setAccountStatus(profile.user_id, 'active')}>{t.unblock}</button>
                  : <button className="btn-danger-outline" onClick={() => setAccountStatus(profile.user_id, 'blocked')}>{t.block}</button>}
                <button className="btn-ghost small" onClick={() => requestPasswordReset(profile.email)}>{t.reset}</button>
                <button className="btn-danger-outline" onClick={() => deleteUserData(profile.user_id)}>{t.del}</button>
              </div>
            </div>
          ))}
          {filteredProfiles.length === 0 && <p className="muted center">{isEn ? 'No matching users.' : 'Нема резултати.'}</p>}
        </div>
      </div>
    </div>
  )
}

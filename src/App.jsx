import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

import AuthPage from './pages/AuthPage'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import VezbiPage from './pages/VezbiPage'
import IshranePage from './pages/IshranePage'
import MerkiPage from './pages/MerkiPage'
import SettingsPage from './pages/SettingsPage'
import IzveshtajPage from './pages/IzveshtajPage'
import PlanoviPage from './pages/PlanoviPage'
import LeaderboardPage from './pages/LeaderboardPage'
import OnboardingPage from './pages/OnboardingPage'
import AdminPage, { isAdminUser } from './pages/AdminPage'
import GuestPage from './pages/GuestPage'
import { trackDemoEvent } from './lib/demoAnalytics'

import BottomNav from './components/BottomNav'
import PWAInstall from './components/PWAInstall'
import FeedbackButton from './components/FeedbackButton'

import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState(null)
  const [guestMode, setGuestMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')
  const [goals, setGoals] = useState(null)
  const [onboardingDone, setOnboardingDone] = useState(null)
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) console.error('Error getting session:', error)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Unexpected session error:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        setAuthMode(null)
        setGuestMode(false)
        return
      }

      setGoals(null)
      setOnboardingDone(null)
      setIsBlocked(false)

      if (event === 'SIGNED_OUT') {
        setAuthMode(null)
        setGuestMode(false)
        setPage('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) loadUserData(user.id)
  }, [user])

  useEffect(() => {
    const handler = e => setPage(e.detail)
    window.addEventListener('navigate', handler)
    return () => window.removeEventListener('navigate', handler)
  }, [])

  function openDemo(source = 'landing') {
    trackDemoEvent('view_demo_click', { source }).catch(() => {})
    setAuthMode(null)
    setGuestMode(true)
  }

  async function loadUserData(userId = user?.id) {
    if (!userId) return

    try {
      const [{ data: goalsData, error: goalsError }, { data: profil, error: profilError }, { data: statusRow }] = await Promise.all([
        supabase.from('goals').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('profili').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('account_status').select('*').eq('user_id', userId).maybeSingle().then(res => res).catch(() => ({ data: null })),
      ])

      if (goalsError) console.error('Error loading goals:', goalsError)
      if (profilError) console.error('Error loading profile:', profilError)

      setGoals(goalsData)
      setOnboardingDone(Boolean(profil?.onboarding_done))
      setIsBlocked(Boolean(statusRow?.is_blocked) || statusRow?.status === 'blocked')

      try {
        const fullName = (user.user_metadata?.full_name || '').trim()
        const metaIme = user.user_metadata?.ime || user.user_metadata?.first_name || fullName.split(' ')[0] || null
        const metaPrezime = user.user_metadata?.prezime || user.user_metadata?.last_name || fullName.split(' ').slice(1).join(' ') || null

        await supabase.from('profili').upsert({
          user_id: userId,
          email: user.email?.toLowerCase() || null,
          ime: metaIme,
          prezime: metaPrezime,
          full_name: fullName || [metaIme, metaPrezime].filter(Boolean).join(' ') || null,
        }, { onConflict: 'user_id' })
      } catch {}
    } catch (error) {
      console.error('Error loading user data:', error)
      setOnboardingDone(false)
    }
  }

  if (loading) return <LoadingScreen />

  if (!user) {
    if (guestMode) {
      return (
        <GuestPage
          onBackHome={() => { setGuestMode(false); setAuthMode(null) }}
          onLogin={() => { setGuestMode(false); setAuthMode('login') }}
          onRegister={() => { setGuestMode(false); setAuthMode('register') }}
        />
      )
    }

    if (!authMode) {
      return (
        <LandingPage
          onLogin={() => setAuthMode('login')}
          onRegister={() => setAuthMode('register')}
          onGuest={() => openDemo('landing')}
        />
      )
    }

    return (
      <AuthPage
        initialMode={authMode}
        onBackHome={() => { setAuthMode(null); setGuestMode(false) }}
        onGuest={() => openDemo('auth')}
      />
    )
  }

  const admin = isAdminUser(user)

  if (isBlocked && !admin) {
    return (
      <div className="auth-wrap">
        <div className="auth-box">
          <div className="auth-logo">FITNESS</div>
          <p className="auth-sub">Твојот акаунт е привремено блокиран.</p>
          <button className="btn-danger-full" onClick={() => supabase.auth.signOut()}>Одјави се</button>
        </div>
      </div>
    )
  }

  if (admin) {
    return (
      <div className="app">
        <PWAInstall />
        <div className="page-wrap">
          <AdminPage user={user} />
        </div>
        <BottomNav active="admin" onChange={setPage} isAdmin={admin} />
      </div>
    )
  }

  if (onboardingDone === null) return <LoadingScreen />

  if (!onboardingDone) {
    return <OnboardingPage user={user} onDone={async () => { setOnboardingDone(true); await loadUserData(user.id) }} />
  }

  return (
    <div className="app">
      <PWAInstall />
      <div className="page-wrap">
        {page === 'dashboard' && <Dashboard user={user} goals={goals} />}
        {page === 'vezbi' && <VezbiPage user={user} />}
        {page === 'ishrana' && <IshranePage user={user} goals={goals} />}
        {page === 'merki' && <MerkiPage user={user} />}
        {page === 'planovi' && <PlanoviPage user={user} />}
        {page === 'izveshtaj' && <IzveshtajPage user={user} goals={goals} />}
        {page === 'leaderboard' && <LeaderboardPage user={user} />}
        {page === 'settings' && <SettingsPage user={user} onGoalsUpdate={setGoals} onResetOnboarding={() => { setOnboardingDone(false); setPage('dashboard') }} />}
      </div>
      <BottomNav active={page} onChange={setPage} isAdmin={admin} />
      <FeedbackButton user={user} page={page} />
    </div>
  )
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="loading-logo">FITNESS</div></div>
}

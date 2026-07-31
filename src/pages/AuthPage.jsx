import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage } from '../lib/LanguageContext'
import { cleanText, emailError, isValidEmail, validateFullName } from '../lib/validation'

const AUTH_REDIRECT_URL = 'https://fit-progress-app.vercel.app'

export default function AuthPage({ initialMode = 'login', onBackHome, onGuest }) {
  const { lang } = useLanguage()
  const isEn = lang === 'en'

  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setMode(initialMode)
    setError('')
    setSuccess('')
  }, [initialMode])

  const t = {
    back: isEn ? '← Back to home' : '← Назад на почетна',
    logo: 'FITNESS',
    subtitle: isEn
      ? 'Personal fitness tracker for workouts, nutrition and progress'
      : 'Личен фитнес тракер за тренинзи, исхрана и прогрес',
    login: isEn ? 'Log in' : 'Најава',
    register: isEn ? 'Create account' : 'Регистрација',
    magic: isEn ? 'Magic link' : 'Magic link',
    fullName: isEn ? 'First and last name' : 'Име и презиме',
    fullNamePh: isEn ? 'Marko Markovski' : 'Марко Марковски',
    password: isEn ? 'Password' : 'Лозинка',
    passwordPh: isEn
      ? 'At least 8 characters, letter and number'
      : 'Минимум 8 знаци, буква и бројка',
    loading: isEn ? 'Loading...' : 'Вчитување...',
    sendLink: isEn ? 'Send magic link' : 'Испрати magic link',
    loginBtn: isEn ? 'Log in' : 'Најави се',
    registerBtn: isEn ? 'Create account' : 'Креирај профил',
    divider: isEn ? 'or' : 'или',
    demo: isEn ? 'View demo version' : 'Види демо верзија',
    magicHint: isEn
      ? 'We will send a secure link to your email. You can open the app only from that inbox.'
      : 'Ќе испратиме безбеден линк на email. Апликацијата се отвора само преку тој inbox.',
    registerHint: isEn
      ? 'Create an account with your email and password. You may need to confirm your email before logging in.'
      : 'Креирај профил со email и лозинка. Можеби ќе треба да го потврдиш email-от пред најава.',
    badLogin: isEn ? 'Wrong email or password.' : 'Погрешен email или лозинка.',
    verifySent: isEn
      ? 'Check your email. We sent you a verification / magic link.'
      : 'Провери го email-от. Испративме verification / magic link.',
    accountCreated: isEn
      ? 'Account created. Check your email to confirm your account, then log in.'
      : 'Профилот е креиран. Провери го email-от за потврда, па најави се.',
  }

  function switchMode(next) {
    setMode(next)
    setError('')
    setSuccess('')
    setPassword('')
  }

  function validatePassword(value) {
    if (!value) {
      return isEn ? 'Enter your password.' : 'Внеси лозинка.'
    }

    if (value.length < 8) {
      return isEn
        ? 'Password must have at least 8 characters.'
        : 'Лозинката мора да има минимум 8 знаци.'
    }

    if (!/[A-Za-zА-Яа-я]/.test(value) || !/\d/.test(value)) {
      return isEn
        ? 'Password must contain at least one letter and one number.'
        : 'Лозинката мора да има барем една буква и една бројка.'
    }

    return ''
  }

  function getCleanEmail() {
    return cleanText(email, 254).toLowerCase()
  }

  async function sendMagicLink({ createUser = false } = {}) {
    const cleanEmail = getCleanEmail()
    const emailValidation = emailError(cleanEmail, isEn)

    if (emailValidation) {
      setError(emailValidation)
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: createUser,
        emailRedirectTo: AUTH_REDIRECT_URL,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(t.verifySent)
  }

  async function handlePasswordLogin(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanEmail = getCleanEmail()
    const emailValidation = emailError(cleanEmail, isEn)

    if (emailValidation) {
      setError(emailValidation)
      return
    }

    const passwordValidation = validatePassword(password)
    if (passwordValidation) {
      setError(passwordValidation)
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    setLoading(false)

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setError(isEn ? 'Please confirm your email before logging in.' : 'Потврди го email-от пред најава.')
      } else {
        setError(t.badLogin)
      }
      return
    }

    const currentUser = data?.user

    if (currentUser && !currentUser.email_confirmed_at && !currentUser.confirmed_at) {
      setSuccess(isEn ? 'Please verify your email before continuing.' : 'Потврди го email-от пред да продолжиш.')
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanName = cleanText(name, 100)
    const cleanEmail = getCleanEmail()

    const nameValidation = validateFullName(cleanName, isEn)
    if (nameValidation) {
      setError(nameValidation)
      return
    }

    const emailValidation = emailError(cleanEmail, isEn)
    if (emailValidation) {
      setError(emailValidation)
      return
    }

    const passwordValidation = validatePassword(password)
    if (passwordValidation) {
      setError(passwordValidation)
      return
    }

    const parts = cleanName.split(' ').filter(Boolean)
    const ime = parts[0]
    const prezime = parts.slice(1).join(' ')

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: AUTH_REDIRECT_URL,
        data: {
          full_name: cleanName,
          ime,
          prezime,
        },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(t.accountCreated)
    setPassword('')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <button type="button" className="auth-back" onClick={onBackHome}>
          {t.back}
        </button>

        <div className="auth-logo">{t.logo}</div>
        <p className="auth-sub">{t.subtitle}</p>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
            {t.login}
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>
            {t.register}
          </button>
          <button type="button" className={mode === 'magic' ? 'active' : ''} onClick={() => switchMode('magic')}>
            {t.magic}
          </button>
        </div>

        {mode === 'login' && (
          <form onSubmit={handlePasswordLogin} noValidate>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
              />
            </div>

            <div className="field">
              <label>{t.password}</label>
              <input
                type="password"
                placeholder={t.passwordPh}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t.loading : t.loginBtn}
            </button>

            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => sendMagicLink({ createUser: false })}
              disabled={loading || !isValidEmail(getCleanEmail())}
            >
              {t.sendLink}
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} noValidate>
            <p className="muted small" style={{ marginBottom: 12 }}>
              {t.registerHint}
            </p>

            <div className="field">
              <label>{t.fullName}</label>
              <input
                type="text"
                placeholder={t.fullNamePh}
                value={name}
                onChange={e => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
              />
            </div>

            <div className="field">
              <label>{t.password}</label>
              <input
                type="password"
                placeholder={t.passwordPh}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t.loading : t.registerBtn}
            </button>
          </form>
        )}

        {mode === 'magic' && (
          <div>
            <p className="muted small" style={{ marginBottom: 12 }}>
              {t.magicHint}
            </p>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <button
              type="button"
              className="btn-primary"
              onClick={() => sendMagicLink({ createUser: false })}
              disabled={loading || !isValidEmail(getCleanEmail())}
            >
              {loading ? t.loading : t.sendLink}
            </button>
          </div>
        )}

        <div className="auth-divider">
          <span>{t.divider}</span>
        </div>

        <button type="button" className="btn-ghost auth-guest" onClick={onGuest}>
          {t.demo}
        </button>
      </div>
    </div>
  )
}
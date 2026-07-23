import { useLanguage } from '../lib/LanguageContext'

export default function LandingPage({ onLogin, onRegister, onGuest }) {
  const { isEn, toggleLang } = useLanguage()

  const goToLogin = () => {
    if (onLogin) onLogin()
  }

  const goToRegister = () => {
    if (onRegister) onRegister()
  }

  const goToGuest = () => {
    if (onGuest) onGuest()
  }

  const t = {
    login: isEn ? 'Log in' : 'Најави се',
    badge: isEn ? '⚡ Your personal fitness tracker' : '⚡ Твој личен фитнес тракер',
    h1a: isEn ? 'Track your' : 'Следи го твојот',
    h1b: isEn ? 'progress.' : 'напредок.',
    subtitle: isEn
      ? 'Build better habits, track workouts, nutrition, measurements and results — all in one place.'
      : 'Гради подобри навики, следи тренинзи, исхрана, мерки и резултати — сè на едно место.',
    start: isEn ? 'Get started' : 'Започни сега',
    register: isEn ? 'Sign up' : 'Регистрирај се',
    guest: isEn ? 'View demo version' : 'Види демо верзија',
    guestNote: isEn ? 'Demo uses sample data only. Nothing personal is saved until you create an account.' : 'Демо верзијата користи пример податоци. Ништо лично не се зачувува додека не направиш акаунт.',
    focusLabel: isEn ? "Today's focus" : 'Денешен фокус',
    focusTitle: isEn ? 'Push workout' : 'Push тренинг',
    progressBadge: isEn ? '+12% progress this month' : '+12% напредок овој месец',
  }

  const features = [
    {
      icon: '💪',
      title: isEn ? 'Workouts + weight' : 'Вежби + килажа',
      text: isEn ? 'Log exercises, sets, reps and weight.' : 'Запишувај вежби, серии, повторувања и тежина.'
    },
    {
      icon: '📏',
      title: isEn ? 'BMI calculator' : 'BMI калкулатор',
      text: isEn ? 'Track body measurements and basic fitness metrics.' : 'Следи телесни мерки и основни фитнес показатели.'
    },
    {
      icon: '🥗',
      title: isEn ? 'Nutrition' : 'Исхрана',
      text: isEn ? 'Organize meals and improve daily habits.' : 'Организирај оброци и подобри ги дневните навики.'
    },
    {
      icon: '📊',
      title: isEn ? 'Reports' : 'Извештај',
      text: isEn ? 'Review your progress over time.' : 'Прегледај го напредокот низ време.'
    },
    {
      icon: '📋',
      title: isEn ? 'Ready-made plans' : 'Готови планови',
      text: isEn ? 'Pick a training plan for your level.' : 'Избери тренинг план според твоето ниво.'
    },
    {
      icon: '🏆',
      title: isEn ? 'Compare' : 'Споредување',
      text: isEn ? 'Stay motivated through results and progress.' : 'Мотивирај се преку резултати и напредок.'
    }
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top right, rgba(200,240,96,0.18), transparent 32%), radial-gradient(circle at bottom left, rgba(96,212,240,0.12), transparent 34%), #070907',
        color: '#f5f5f5',
        padding: '24px 18px 80px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto'
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            marginBottom: '48px'
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: '800',
              letterSpacing: '0.12em'
            }}
          >
            FITNESS
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={toggleLang}
              style={{
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5',
                borderRadius: '999px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {isEn ? '🌐 MK' : '🌐 EN'}
            </button>

            <button
              type="button"
              onClick={goToLogin}
              style={{
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)',
                color: '#f5f5f5',
                borderRadius: '999px',
                padding: '10px 18px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {t.login}
            </button>
          </div>
        </header>

        <section
          className="landing-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '34px',
            alignItems: 'center',
            marginBottom: '34px'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(200,240,96,0.25)',
                background: 'rgba(200,240,96,0.08)',
                color: '#c8f060',
                padding: '8px 13px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: '700',
                marginBottom: '18px'
              }}
            >
              ⚡ {isEn ? 'Your personal fitness tracker' : 'Твој личен фитнес тракер'}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(42px, 7vw, 78px)',
                lineHeight: '0.95',
                letterSpacing: '-0.06em',
                maxWidth: '680px'
              }}
            >
              {t.h1a}{' '}
              <span style={{ color: '#c8f060' }}>{t.h1b}</span>
            </h1>

            <p
              style={{
                marginTop: '22px',
                marginBottom: '0',
                color: '#b7b7b7',
                fontSize: '18px',
                lineHeight: '1.7',
                maxWidth: '620px'
              }}
            >
              {t.subtitle}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '28px',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                onClick={goToRegister}
                style={{
                  background: '#c8f060',
                  color: '#050505',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '15px 28px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  minWidth: '160px'
                }}
              >
                {t.start}
              </button>

              <button
                type="button"
                onClick={goToRegister}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  color: '#f5f5f5',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px',
                  padding: '15px 28px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minWidth: '160px'
                }}
              >
                {t.register}
              </button>

              <button
                type="button"
                onClick={goToGuest}
                style={{
                  background: 'transparent',
                  color: '#c8f060',
                  border: '1px solid rgba(200,240,96,0.38)',
                  borderRadius: '16px',
                  padding: '15px 28px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  minWidth: '180px'
                }}
              >
                {t.guest}
              </button>
            </div>

            <p
              style={{
                color: '#8f9b8e',
                fontSize: '13px',
                lineHeight: '1.6',
                marginTop: '12px',
                maxWidth: '520px'
              }}
            >
              {t.guestNote}
            </p>
          </div>

          <div
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              borderRadius: '30px',
              padding: '22px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)'
            }}
          >
            <div
              style={{
                background: '#0e120e',
                borderRadius: '22px',
                padding: '18px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <div
                style={{
                  color: '#9a9a9a',
                  fontSize: '13px',
                  marginBottom: '12px'
                }}
              >
                {t.focusLabel}
              </div>

              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '800',
                  marginBottom: '16px'
                }}
              >
                {t.focusTitle}
              </div>

              {['Bench press', 'Shoulder press', 'Triceps pushdown'].map(
                (item, index) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '14px',
                      padding: '13px 14px',
                      marginBottom: '10px'
                    }}
                  >
                    <span>{item}</span>
                    <span style={{ color: '#c8f060', fontWeight: '700' }}>
                      {index + 3}x10
                    </span>
                  </div>
                )
              )}

              <div
                style={{
                  marginTop: '18px',
                  background: 'rgba(200,240,96,0.1)',
                  border: '1px solid rgba(200,240,96,0.25)',
                  color: '#c8f060',
                  borderRadius: '16px',
                  padding: '14px',
                  fontWeight: '700',
                  textAlign: 'center'
                }}
              >
                {t.progressBadge}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '14px',
            marginTop: '34px'
          }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              style={{
                background: 'rgba(255,255,255,0.055)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '22px',
                padding: '20px',
                minHeight: '145px',
                boxShadow: '0 14px 40px rgba(0,0,0,0.22)'
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '14px' }}>
                {feature.icon}
              </div>

              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '18px',
                  color: '#ffffff'
                }}
              >
                {feature.title}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: '#b7b7b7',
                  fontSize: '14px',
                  lineHeight: '1.55'
                }}
              >
                {feature.text}
              </p>
            </div>
          ))}
        </section>
      </div>

      <style>
        {`
          @media (max-width: 820px) {
            .landing-grid {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 520px) {
            button {
              width: 100%;
            }
          }
        `}
      </style>
    </div>
  )
}
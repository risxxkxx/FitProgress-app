import { useState } from 'react'
import { useTheme } from '../lib/ThemeContext'
import { useLanguage } from '../lib/LanguageContext'

const TABS = [
  { id: 'dashboard', icon: '🏠', mk: 'Дома', en: 'Home' },
  { id: 'vezbi', icon: '💪', mk: 'Вежби', en: 'Workouts' },
  { id: 'ishrana', icon: '🥗', mk: 'Исхрана', en: 'Nutrition' },
  { id: 'merki', icon: '📏', mk: 'Мерки', en: 'Body' },
  { id: 'planovi', icon: '📋', mk: 'Планови', en: 'Plans' },
  { id: 'izveshtaj', icon: '📊', mk: 'Извештај', en: 'Reports' },
  { id: 'leaderboard', icon: '🏆', mk: 'Листа', en: 'Board' },
  { id: 'settings', icon: '⚙️', mk: 'Цели', en: 'Goals' },
]

export default function BottomNav({ active, onChange, isAdmin = false }) {
  const [showMore, setShowMore] = useState(false)
  const { theme, toggle } = useTheme()
  const { lang, toggleLang } = useLanguage()

  const allTabs = isAdmin
    ? [{ id: 'admin', icon: '🛡️', mk: 'Преглед', en: 'Overview' }]
    : TABS
  const mainTabs = allTabs.slice(0, 4)
  const moreTabs = allTabs.slice(4)
  const label = t => (lang === 'en' ? t.en : t.mk)

  function go(id) {
    onChange(id)
    setShowMore(false)
  }

  return (
    <>
      <div className="sidebar">
        <div className="sidebar-logo">FITNESS</div>

        <nav className="sidebar-nav">
          {allTabs.map(t => (
            <button
              key={t.id}
              className={`sidebar-item ${active === t.id ? 'active' : ''}`}
              onClick={() => go(t.id)}
            >
              <span className="sidebar-icon">{t.icon}</span>
              <span className="sidebar-label">{label(t)}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-actions">
          <button className="theme-toggle" onClick={toggle}>
            <span>{theme === 'dark' ? (lang === 'en' ? 'Light theme' : 'Светла тема') : (lang === 'en' ? 'Dark theme' : 'Темна тема')}</span>
            <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>
          <button className="theme-toggle" onClick={toggleLang}>
            <span>{lang === 'en' ? 'Македонски' : 'English'}</span>
            <span className="theme-toggle-icon">🌐</span>
          </button>
        </div>
      </div>

      <div className="mobile-nav">
        {mainTabs.map(t => (
          <button
            key={t.id}
            className={`nav-item ${active === t.id ? 'active' : ''}`}
            onClick={() => go(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{label(t)}</span>
          </button>
        ))}

        <button
          className={`nav-item ${moreTabs.some(t => t.id === active) ? 'active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          <span className="nav-icon">☰</span>
          <span className="nav-label">{lang === 'en' ? 'More' : 'Повеќе'}</span>
        </button>
      </div>

      {showMore && (
        <>
          <div className="more-overlay" onClick={() => setShowMore(false)} />

          <div className="more-menu">
            {moreTabs.map(t => (
              <button
                key={t.id}
                className={`more-item ${active === t.id ? 'active' : ''}`}
                onClick={() => go(t.id)}
              >
                <span className="more-icon">{t.icon}</span>
                <span className="more-label">{label(t)}</span>
              </button>
            ))}
            <button className="more-item" onClick={toggle}>
              <span className="more-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="more-label">{theme === 'dark' ? (lang === 'en' ? 'Light theme' : 'Светла тема') : (lang === 'en' ? 'Dark theme' : 'Темна тема')}</span>
            </button>
            <button className="more-item" onClick={toggleLang}>
              <span className="more-icon">🌐</span>
              <span className="more-label">{lang === 'en' ? 'Македонски' : 'English'}</span>
            </button>
          </div>
        </>
      )}
    </>
  )
}

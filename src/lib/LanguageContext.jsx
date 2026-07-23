import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('fit_lang') || 'mk')

  useEffect(() => {
    localStorage.setItem('fit_lang', lang)
    document.documentElement.lang = lang === 'en' ? 'en' : 'mk'
  }, [lang])

  const value = useMemo(() => ({
    lang,
    setLang,
    toggleLang: () => setLang(current => (current === 'mk' ? 'en' : 'mk')),
    isEn: lang === 'en'
  }), [lang])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return context
}

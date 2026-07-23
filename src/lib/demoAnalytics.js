import { supabase } from './supabase'

export async function trackDemoEvent(eventName = 'view_demo_click', metadata = {}) {
  try {
    const payload = {
      event_name: eventName,
      source: metadata.source || 'landing',
      language: metadata.language || (typeof localStorage !== 'undefined' ? localStorage.getItem('fit_lang') : null) || null,
      metadata: {
        ...metadata,
        pathname: typeof window !== 'undefined' ? window.location.pathname : null,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      },
    }

    const { error } = await supabase.from('demo_analytics').insert(payload)
    if (error) console.warn('Demo analytics not saved:', error.message)
  } catch (error) {
    console.warn('Demo analytics error:', error?.message || error)
  }
}

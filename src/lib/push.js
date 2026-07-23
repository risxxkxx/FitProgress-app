import { supabase } from './supabase'

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function notificationPermission() {
  return pushSupported() ? Notification.permission : 'unsupported' // 'granted' | 'denied' | 'default'
}

// Дали апликацијата работи како инсталирана PWA (важно за iOS — Web Push таму работи
// само кога апликацијата е додадена на почетен екран, не во обичен Safari таб).
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function enablePushNotifications(userId) {
  if (!pushSupported()) throw new Error('unsupported')

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) throw new Error('missing-vapid-key')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('permission-denied')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  }, { onConflict: 'endpoint' })

  if (error) throw error
  return true
}

export async function disablePushNotifications() {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe()
  }
}

export async function isPushEnabled() {
  if (!pushSupported()) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return Boolean(subscription)
}

// supabase/functions/send-reminders/index.ts
//
// Privileged Edge Function for scheduled push reminders.
// The function uses the Supabase service-role key internally, so callers must pass
// an additional server-only X-Cron-Secret. A normal/anon Supabase JWT alone is not enough.
//
// Required Supabase function secrets:
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT
//   REMINDER_CRON_SECRET
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided to deployed Supabase
// Edge Functions by the platform. Never expose the service-role key in client code.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
const cronSecret = Deno.env.get('REMINDER_CRON_SECRET') || ''

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

async function secureEqual(a: string, b: string) {
  const encoder = new TextEncoder()
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ])

  const left = new Uint8Array(aHash)
  const right = new Uint8Array(bHash)
  let diff = 0
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i]
  return diff === 0
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!cronSecret) {
    console.error('REMINDER_CRON_SECRET is not configured')
    return json({ error: 'Server configuration error' }, 500)
  }

  const suppliedSecret = req.headers.get('x-cron-secret') || ''
  if (!suppliedSecret || !(await secureEqual(suppliedSecret, cronSecret))) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const title = String(body.title || 'Фитнес Трекер').trim().slice(0, 120)
    const message = String(body.body || 'Не заборавај на денешните цели! 💪').trim().slice(0, 500)
    const requestedUrl = String(body.url || '/').trim()
    const url = requestedUrl.startsWith('/') ? requestedUrl.slice(0, 500) : '/'

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth')

    if (error) throw error

    const payload = JSON.stringify({ title, body: message, url })

    const results = await Promise.allSettled(
      (subs || []).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          throw err
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return json({ sent, total: subs?.length || 0 })
  } catch (error) {
    console.error('send-reminders failed', error)
    return json({ error: 'Internal server error' }, 500)
  }
})

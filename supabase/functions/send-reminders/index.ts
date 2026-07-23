// supabase/functions/send-reminders/index.ts
//
// Оваа Edge Function ги испраќа закажаните push потсетници (тренинг / вода / суплементи)
// до сите претплатени корисници. Се вика или рачно (за тест), или закажано преку pg_cron
// (види ги инструкциите во README_PUSH.md).
//
// Deploy:
//   supabase functions deploy send-reminders
//
// Потребни secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (пр. mailto:you@example.com)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (SUPABASE_URL и ANON key се веќе достапни по default,
//   но за читање на push_subscriptions без RLS ограничувања треба service role key)

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}))
    const title = body.title || 'Фитнес Трекер'
    const message = body.body || 'Не заборавај на денешните цели! 💪'
    const url = body.url || '/'

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: subs, error } = await supabase.from('push_subscriptions').select('*')
    if (error) throw error

    const payload = JSON.stringify({ title, body: message, url })

    const results = await Promise.allSettled(
      (subs || []).map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async (err) => {
          // 410/404 значи претплатата веќе не важи (корисникот одјавил известувања) — ја бришеме.
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
          throw err
        })
      )
    )

    const sent = results.filter(r => r.status === 'fulfilled').length
    return new Response(JSON.stringify({ sent, total: subs?.length || 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})

# Push нотификации — поставување

Кодот на клиентот е готов (`src/lib/push.js`, `src/sw.js`, известувања во Поставки).
За да проработи целосно, треба да се направат неколку чекори еднократно.

## 1. Примени ја SQL патч-датотеката

Отвори SQL Editor во Supabase Dashboard и изврши ја `supabase_patch_barcode_push.sql`
(додава `push_subscriptions` табела + колони за јаглехидрати/масти во `obroci`).

## 2. Генерирај VAPID клучеви (еднократно)

Локално, со Node инсталиран:

```bash
npx web-push generate-vapid-keys
```

Ќе добиеш јавен и приватен клуч. Јавниот оди во `.env` на апликацијата:

```
VITE_VAPID_PUBLIC_KEY=<јавниот клуч>
```

Приватниот VAPID клуч и `REMINDER_CRON_SECRET` НИКОГАШ не одат во frontend апликацијата или GitHub — само во Supabase Edge Function secrets:

```bash
supabase secrets set VAPID_PUBLIC_KEY=<јавниот клуч>
supabase secrets set VAPID_PRIVATE_KEY=<приватниот клуч>
supabase secrets set VAPID_SUBJECT=mailto:твојот-емаил@пример.com
supabase secrets set REMINDER_CRON_SECRET=<долг-случаен-server-only-secret>
```

## 3. Деплојирај ја Edge Function-та

```bash
supabase functions deploy send-reminders
```

## 4. Тестирај рачно

```bash
curl -X POST https://<project-ref>.functions.supabase.co/send-reminders \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "X-Cron-Secret: <REMINDER_CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Тренинг потсетник","body":"Време е за тренинг 💪"}'
```

Секој корисник кој ги вклучил известувањата (во Поставки → Известувања) треба да добие
push нотификација, дури и кога апликацијата е затворена.

## 5. (Опционално) Закажи автоматски потсетници

За вистински дневни потсетници (пр. секој ден во 18:00), треба scheduled повик до
функцијата. Најлесно преку Supabase Dashboard → Database → Cron Jobs (pg_cron +
pg_net), со SQL слично на:

```sql
select cron.schedule(
  'daily-workout-reminder',
  '0 17 * * *',  -- 17:00 UTC — прилагоди според временска зона
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/send-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <ANON_KEY>',
      'X-Cron-Secret', '<REMINDER_CRON_SECRET>',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('title', 'Тренинг потсетник', 'body', 'Не заборавај на денешниот тренинг!')
  );
  $$
);
```

## Важно за iPhone

Web Push на iOS работи **само** ако корисникот прво ја инсталирал апликацијата преку
"Add to Home Screen" во Safari (веќе е објаснето во апликацијата, Поставки → Инсталирај
на телефон). Ако само ја отвора во обичен Safari таб, копчето "Вклучи известувања" нема
да функционира — апликацијата веќе го препознава ова и го известува корисникот.


## Безбедносна забелешка

`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` и `REMINDER_CRON_SECRET` се server-only secrets.
Не ги ставај во `.env` што го чита Vite, во source code, screenshots или GitHub commits.
`VITE_*` променливите се вградуваат во browser bundle и по дефиниција не се тајни.

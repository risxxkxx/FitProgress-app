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

Приватниот клуч НИКОГАШ не оди во апликацијата — само во Supabase Edge Function secrets:

```bash
supabase secrets set VAPID_PUBLIC_KEY=<јавниот клуч>
supabase secrets set VAPID_PRIVATE_KEY=<приватниот клуч>
supabase secrets set VAPID_SUBJECT=mailto:твојот-емаил@пример.com
```

## 3. Деплојирај ја Edge Function-та

```bash
supabase functions deploy send-reminders
```

## 4. Тестирај рачно

```bash
curl -X POST https://<project-ref>.functions.supabase.co/send-reminders \
  -H "Authorization: Bearer <ANON_KEY>" \
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
    headers := jsonb_build_object('Authorization', 'Bearer <ANON_KEY>', 'Content-Type', 'application/json'),
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

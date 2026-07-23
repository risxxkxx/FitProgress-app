# Fit Progress v15 — security, validation and language fixes

This version adds the following fixes:

## Frontend validation

- First and last name cannot be blank or only spaces.
- Full name requires at least two real name parts.
- Email validation blocks invalid emails such as `a@a`.
- Food, macros, grams and measurement inputs block negative values in the UI.
- Saved/loaded food and measurement values are filtered so old invalid test data is not displayed.

## Email verification

Auth now supports magic link login/registration through Supabase OTP.

Recommended Supabase settings:

1. Go to **Authentication → Sign In / Providers → Email**.
2. Turn **Confirm email** ON.
3. Go to **Authentication → URL Configuration**.
4. Add your production URL, for example `https://fit-progress-app.vercel.app`, to the redirect URLs.
5. For production, configure a custom SMTP provider so auth emails do not hit Supabase test limits.

## RLS and data isolation

Run this file in Supabase SQL Editor:

```sql
supabase_patch_v15_security_validation.sql
```

It:

- enables RLS on app tables,
- removes old loose policies,
- allows users to read/update/delete only their own rows,
- allows the admin email `agencynula@gmail.com` to access admin overview data,
- keeps demo analytics insertable by anonymous visitors but readable only by admin,
- replaces the leaderboard with a safe RPC that returns only public display names and workout counts, not private workout records.

## Language switch

The most visible remaining hardcoded pages were updated:

- Auth
- Dashboard
- Measurements
- Leaderboard
- Workouts UI labels
- existing translated pages remain translated

Some exercise names and user-entered content remain in the language they were created in, which is expected.

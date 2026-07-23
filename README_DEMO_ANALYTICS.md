# Demo analytics patch

Before deploying/testing the new demo button analytics, run this SQL file in Supabase SQL Editor:

`supabase_patch_demo_analytics.sql`

What it adds:
- `demo_analytics` table
- anonymous insert policy so visitors can record a demo click
- admin-only read policy for `agencynula@gmail.com`
- admin panel card showing total demo clicks and today's demo clicks

The demo mode uses sample data only. It does not save workouts, plans, notes or personal progress. Only the anonymous click event is stored for admin analytics.

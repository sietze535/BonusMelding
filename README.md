# BonusMelding

Krijg een e-mail wanneer producten die jij volgt bij Albert Heijn in de bonus staan.

## Stack

- Next.js (App Router) op Vercel
- Neon Postgres + Drizzle ORM
- Resend voor e-mail
- Vercel Cron (elke maandag 05:00 UTC)
- Onofficiële Albert Heijn mobile API (`api.ah.nl`)

> **Disclaimer:** er is geen officiële publieke AH API. Endpoints kunnen zonder aankondiging wijzigen. Gebruik op eigen verantwoordelijkheid en respecteer AH’s voorwaarden.

## Lokaal starten

```bash
cp .env.example .env.local
# vul DATABASE_URL, RESEND_API_KEY, CRON_SECRET, NEXT_PUBLIC_APP_URL in

npm install
npm run db:push
npm run dev
```

## Scripts

| Script | Doel |
|--------|------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:push` | Schema naar Neon pushen |
| `npm run db:studio` | Drizzle Studio |

## Deploy op Vercel

1. Importeer [sietze535/BonusMelding](https://github.com/sietze535/BonusMelding) in Vercel (New Project → Import Git Repository).
2. Voeg een Neon Postgres database toe (Vercel Marketplace → Neon) zodat `DATABASE_URL` gezet wordt.
3. Maak een [Resend](https://resend.com) API key en zet:
   - `RESEND_API_KEY`
   - `RESEND_FROM` (bijv. `BonusMelding <onboarding@resend.dev>` tot je eigen domein verified is)
   - `CRON_SECRET` (willekeurige lange string)
   - `NEXT_PUBLIC_APP_URL` (je productie-URL, bijv. `https://bonusmelding.vercel.app`)
4. Deploy, daarna lokaal of in CI: `DATABASE_URL=... npm run db:push`
5. Cron draait maandag 05:00 UTC via `vercel.json`. Test handmatig:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/check-bonus
```

### AH smoke-test (zonder DB)

```bash
node scripts/smoke-ah.mjs
```

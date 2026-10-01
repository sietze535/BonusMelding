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

## Cron handmatig testen

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-bonus
```

## Uitbreiden naar andere supermarkten

Implementeer `SupermarketAdapter` in `src/lib/supermarkets/` en registreer hem in `index.ts`. De kolom `supermarket` op `watched_products` is al aanwezig.

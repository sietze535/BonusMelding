# BonusMelding

Krijg een e-mail wanneer producten die jij volgt bij **Albert Heijn** in de bonus staan.

Live: [bonus-melding.vercel.app](https://bonus-melding.vercel.app)

## Wat het doet

1. Je vult je e-mail in en krijgt een magic link (geen wachtwoord).
2. In het dashboard zoek je AH-producten en klik je **Volgen**.
3. Elke maandag checkt een cronjob de nieuwe bonusfolder.
4. Staat iets van jouw lijst in de bonus? Dan krijg je één digest-mail.

De code is zo opgezet dat later andere supermarkten kunnen worden toegevoegd via een `SupermarketAdapter`.

## Demo / zelf hosten

Je kunt de live site gebruiken, of je eigen instantie deployen (zie hieronder). Secrets horen in Vercel/Neon/Resend — niet in deze repo.

## Stack

| Onderdeel | Keuze |
|-----------|--------|
| Frontend / API | Next.js (App Router) |
| Hosting | Vercel |
| Database | Neon Postgres + Drizzle |
| E-mail | Resend |
| Planning | Vercel Cron (maandag 05:00 UTC) |
| Productdata | Onofficiële AH mobile API (`api.ah.nl`) |

> **Disclaimer:** Albert Heijn biedt geen officiële publieke API voor dit gebruik. De integratie leunt op de mobiele app-API en kan zonder aankondiging breken. Gebruik op eigen risico en respecteer de voorwaarden van AH. Dit project is niet gelieerd aan Albert Heijn.

## Lokaal starten

Vereisten: Node.js 20+, accounts voor Neon en Resend.

```bash
git clone https://github.com/sietze535/BonusMelding.git
cd BonusMelding
cp .env.example .env.local
```

Vul in `.env.local` minimaal:

| Variabele | Uitleg |
|-----------|--------|
| `DATABASE_URL` | Neon connection string |
| `RESEND_API_KEY` | API key van Resend |
| `RESEND_FROM` | Afzender, bijv. `BonusMelding <noreply@jouwdomein.nl>` |
| `CRON_SECRET` | Lange willekeurige string (beschermt cron + setup) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` lokaal |

Daarna:

```bash
npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Handige scripts

| Script | Doel |
|--------|------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:push` | Schema naar Postgres pushen |
| `npm run db:studio` | Drizzle Studio |
| `node scripts/smoke-ah.mjs` | AH API snel testen (geen DB nodig) |

## Deploy op Vercel

1. Fork of clone deze repo en importeer hem in Vercel.
2. Koppel **Neon** (Marketplace) → `DATABASE_URL` wordt gezet.
3. Zet de overige env vars uit de tabel hierboven (Production + idealiter Preview).
4. Deploy.
5. Schema aanmaken (één van beide):
   - lokaal: `DATABASE_URL=... npm run db:push`
   - of production: `POST /api/setup/db` met header `Authorization: Bearer $CRON_SECRET`
6. Zet `NEXT_PUBLIC_APP_URL` op je echte URL en redeploy.

Cron staat in [`vercel.json`](vercel.json) (`0 5 * * 1`). Handmatig testen:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://JOUW-URL/api/cron/check-bonus
```

### Mails uit spam houden

`onboarding@resend.dev` belandt vaak in spam. Verifieer een **eigen domein** in Resend (SPF + DKIM, liefst ook DMARC), zet `RESEND_FROM` daarop, en redeploy.

## Projectstructuur (kort)

```
src/
  app/                 # Pages + API routes
  components/          # UI (landing, dashboard)
  lib/
    db/                # Drizzle schema
    email.ts           # Resend templates
    supermarkets/      # Adapter-interface + Albert Heijn
```

Nieuwe supermarkt: implementeer `SupermarketAdapter` in `src/lib/supermarkets/` en registreer hem in `index.ts`. De kolom `supermarket` op watches bestaat al.

## Licentie

MIT — zie de code als startpunt; feedback en PRs zijn welkom.

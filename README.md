# Ship Down

Minimalistische Zwei-Spieler-Version von Schifferlversenken fuer mobile Browser. Ein Spielraum wird auf dem Server gespeichert, zwei Handys koennen denselben Raum oeffnen und klassisch gegeneinander spielen.

## Stack

- Next.js App Router
- TypeScript
- Server-seitige Spiel-Engine
- Supabase als persistenter Room-Speicher
- Vercel fuer Hosting

## Features

- 2-Spieler-Raeume mit Raumcode
- Klassische 10x10 Partie mit 5 Schiffen
- Treffer gibt einen Bonuszug
- Schiffe duerfen sich nicht beruehren, auch nicht diagonal
- Mobilfreundliche Boards und ruhige Transitionen
- Getrennte Sicht fuer eigene Flotte und gegnerisches Zielfeld
- Server-seitig validierte Zuege, damit niemand im Client schummeln kann

## Lokal starten

1. `.env.example` nach `.env.local` kopieren.
2. Supabase Projekt anlegen.
3. `supabase/schema.sql` im SQL Editor ausfuehren.
4. `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` eintragen.
5. Dependencies installieren:

```bash
npm install
```

6. Dev-Server starten:

```bash
npm run dev
```

## Deployment auf Vercel

1. Repo nach GitHub pushen.
2. In Vercel importieren.
3. `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` als Environment Variables setzen.
4. Deploy ausloesen.

Danach kann eine Person einen Raum erstellen und der zweiten Person einfach den Link oder Raumcode schicken.

## Hinweise

- Der Server speichert komplette Room-States in `public.rooms.state` als `jsonb`.
- Die Route `GET /api/rooms/[roomCode]` liefert nur eine bereinigte Sicht fuer die jeweilige Spielerseite aus.
- Polling ist absichtlich einfach gehalten, damit das Projekt robust auf Vercel laeuft und leicht zu deployen bleibt.

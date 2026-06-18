# TriageOS

TriageOS is an AI Chief of Staff for Gmail and Google Calendar.

Your inbox knows what happened. Your calendar knows what is scheduled. TriageOS knows what to do next.

It connects to Gmail and Calendar through Corsair, imports real work context, generates AI decision cards, and lets a human review, edit, and approve actions before anything is executed.

## Core Story

TriageOS is not an email client, calendar app, task manager, or analytics dashboard. It is an AI decision layer above Gmail and Calendar.

The product flow is:

1. Connect Gmail and Calendar.
2. Sync inbox and schedule context.
3. Generate AI decision cards.
4. Review priorities, replies, meetings, and work.
5. Edit AI-generated replies or calendar actions.
6. Approve execution only when ready.
7. Preserve history and fallback state when external writes fail.

## Product Surfaces

- `/` - public landing page.
- `/pricing` - outcome-focused pricing preview.
- `/briefing` - authenticated home and daily operating room.
- `/gmail` - AI Inbox organized by decisions.
- `/calendar` - scheduling intelligence and meeting readiness.
- `/workflows` - Work Queue for AI-discovered work and approved actions.
- `/activity` - execution history.
- `/settings` - app settings surface.

Authenticated users are routed to `/briefing`. `/dashboard` redirects to `/briefing`.

## Current Capabilities

- Supabase authentication and protected app routes.
- Corsair connection flow for Gmail and Google Calendar.
- Gmail sync into persistent `triage_items`.
- Calendar sync and calendar event creation through Corsair.
- OpenAI-powered workflow card generation.
- AI reply drafting with human editing before execution.
- Draft/save/send execution flow with explicit user approval.
- Demo-safe local fallback when Gmail draft/send writes fail.
- Action logs for execution history.
- AI calendar summary, meeting prep, follow-up detection, and command parsing surfaces.

## Demo-Safe Gmail Writes

Gmail sync works through Corsair. Gmail write operations can vary based on the Corsair Gmail operation contract.

TriageOS handles this safely:

- Save Draft attempts Corsair first.
- If Corsair draft creation fails, the edited reply is preserved locally in `triage_items.suggested_reply`.
- The item remains reviewable with `status = ready`.
- The Corsair error is stored in `triage_items.error_message`.
- The UI shows: `Draft saved in TriageOS. Gmail write failed, but your edited reply is preserved.`
- Send Email does not pretend success if Gmail sending fails. It preserves the reply and tells the user to copy it.

This keeps the demo flow reliable without sending or losing user work.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/Radix-style UI components
- Supabase Auth
- Postgres
- Drizzle ORM
- Corsair App SDK
- OpenAI SDK
- Zod
- lucide-react

## Repository Structure

```txt
app/            Next.js routes and API endpoints
components/     UI and feature components
config/         environment/config helpers
db/             Drizzle schema and models
lib/            integrations, AI, auth, execution, domain logic
scripts/        Corsair helper scripts
supabase/       database migrations
types/          shared TypeScript types
docs/           project status and planning notes
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
copy .env.example .env
```

Fill in the required values in `.env`.

Run the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Environment Variables

See `.env.example` for the full list.

Required for normal local development:

```txt
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
DATABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
```

Required for Corsair-powered Gmail and Calendar:

```txt
CORSAIR_DEV_KEY
CORSAIR_INSTANCE_ID
CORSAIR_INSTANCE_NAME
CORSAIR_API_BASE_URL
CORSAIR_DRIVER
```

Google OAuth helper script inputs:

```txt
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
```

Optional demo fallback:

```txt
TRIAGEOS_DEMO_MODE=true
```

## Corsair Setup

The app uses `@corsair-dev/app`.

Useful scripts:

```bash
npm run corsair:callback
npm run corsair:google-oauth
```

Notes:

- `CORSAIR_DRIVER=auto` tries the SDK first, then REST fallback.
- `CORSAIR_DRIVER=sdk` forces the installed SDK path.
- `CORSAIR_INSTANCE_ID` must be the real Corsair instance ID, not the display name.
- If `CORSAIR_INSTANCE_ID` is empty, the app can list/create by `CORSAIR_INSTANCE_NAME`.

## OpenAI Setup

Set:

```txt
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

The AI planner generates structured JSON and validates it with Zod before persisting the result.

## Database

The app uses Drizzle models in `db/models` and Supabase/Postgres migrations in `supabase/migrations`.

Important tables include:

- `profiles`
- `triage_items`
- `calendar_events`
- `corsair_connections`
- `action_logs`
- `user_preferences`

## Key API Routes

- `POST /api/corsair/connect` - create Corsair connect URL.
- `GET /api/corsair/connected` - reconcile connection after Corsair return.
- `GET /api/corsair/status` - read/reconcile remote connection status.
- `POST /api/triage/generate` - sync Gmail and create triage items.
- `POST /api/triage/analyze` - generate an AI workflow card.
- `POST /api/execute` - execute approved draft/send/calendar actions.
- `POST /api/calendar/sync` - sync calendar events.
- `POST /api/calendar/events` - create calendar events.
- `POST /api/calendar/summary` - generate calendar summary.
- `POST /api/calendar/meeting-prep` - generate meeting prep.
- `POST /api/gmail/follow-ups` - detect follow-up opportunities.
- `POST /api/agent` - parse and execute confirmed command actions.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run corsair:callback
npm run corsair:google-oauth
```

Typecheck:

```bash
npx tsc --noEmit
```

## Verification

Before demoing or deploying:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Demo Flow

Recommended judge-facing flow:

1. Open the landing page.
2. Sign in.
3. Land on Briefing.
4. Connect Gmail and Calendar.
5. Sync Inbox.
6. Generate an AI card.
7. Review and edit the AI reply.
8. Save Draft.
9. If Gmail write fails, show the preserved local draft and Copy Reply.
10. Open Schedule to show meeting readiness.
11. Open Work Queue to show AI-discovered work becoming approved action.
12. Open Activity to show execution history.

## Design Direction

The app is designed around:

- calm decision-making
- premium minimalism
- human approval
- clear next actions
- reliable demo behavior

Visual references: Linear, Arc, Cron, Raycast, Notion.

## Known Limitations

- Gmail write operations depend on Corsair Gmail operation contracts and may fall back locally.
- Send Email is explicit and honest: failures preserve the reply but do not claim it sent.
- Settings are not fully persistent yet.
- Background sync/webhook ingestion is not the primary path.
- Billing, teams, enterprise analytics, and production observability are intentionally out of scope for the current demo.

## Project Status

TriageOS is currently a hackathon-ready MVP focused on the core story:

> TriageOS understands inbox and calendar context, proposes actions, and executes only after user approval.


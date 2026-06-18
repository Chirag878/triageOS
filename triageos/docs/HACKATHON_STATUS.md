Executive SummaryTriageOS is currently a solid hackathon MVP foundation, not yet a production product.

It already has:

Supabase authentication and protected app routes.

Corsair-based Gmail and Google Calendar integration.

Gmail ingestion into persistent triage_items.

AI workflow card generation through OpenAI.

Safe execution flow that creates Gmail drafts and Calendar events only after confirmation.

A much improved app shell with dedicated Gmail, Calendar, AI, Dashboard, Workflows, Activity, and Settings pages.

A command palette that plans/executes simple natural-language Gmail/Calendar tasks.

Drizzle/Postgres models, migrations, action logs, env helpers, and build-safe DB handling.

However, the product is still incomplete in several important areas:

Google connection state is optimistic and can mark Gmail/Calendar connected without fully verifying actual Corsair plugin state.

Calendar events are synced into client state only, not persisted in a calendar-event table.

Calendar edit currently updates only the local UI, not Google Calendar.

AI is useful for email triage cards but is not yet a true autonomous agent or daily assistant.

Activity logs exist, but monitoring, retries, failure diagnostics, and observability are shallow.

Settings are mostly static display cards, not persisted user-configurable preferences.

No tests, no CI, no background jobs, no webhook ingestion, no notifications, no billing, no production-grade reliability layer.

Several large components are becoming difficult to maintain.

Estimated completion:

Category	EstimateOverall project completion	58%MVP completion	74%Hackathon readiness	72%Startup/product readiness	32%

Project OverviewWhat TriageOS currently doesTriageOS is an AI-assisted productivity/workflow app that connects to Gmail and Google Calendar through Corsair, imports Gmail messages, turns them into structured workflow cards, and lets the user review AI-generated replies and calendar actions before execution.

The current dashboard explicitly presents the core flow as: sync Gmail, generate an AI card, review reply/event, then approve the action bundle. app/dashboard/page.tsx maps triage items into the main TriageDashboard and shows hero guidance for sync → generate → approve.

Core user journeyThe intended user journey is:

Sign up / log in.

Enter the authenticated app shell.

Connect Gmail and Calendar through Corsair.

Sync Gmail.

Review imported email workflow cards.

Generate AI recommendations.

Create Gmail drafts and/or Google Calendar events after confirmation.

Use dedicated Gmail, Calendar, AI, Workflows, Activity, and Settings pages for daily usage.

The app shell already exposes these core destinations: Dashboard, Gmail, Calendar, AI Lab, Workflows, Activity, and Settings.

Existing integrationsSupabaseSupabase is used for authentication. Server-side session helpers call Supabase, create or update a profile, and redirect unauthenticated users to /login.

CorsairCorsair is used as the abstraction layer for Gmail and Google Calendar. The connect endpoint creates a Corsair connect link for the configured plugins and uses a safe returnTo allowlist.

GmailGmail sync uses Corsair paths gmail.api.messages.list and gmail.api.messages.get, imports recent non-promotional messages, normalizes headers/body/snippet, and stores them as triage items.

Google CalendarCalendar sync uses Corsair path googlecalendar.api.events.getMany, reads upcoming primary calendar events, normalizes title/time/attendees, and returns events to the client.

Calendar event creation uses Corsair path googlecalendar.api.events.create, supports attendees, timezone, description, and popup reminders.

OpenAIAI card generation uses the OpenAI SDK, requires OPENAI_API_KEY, calls chat completions with JSON output, and validates the result.

Existing AI capabilitiesCurrent AI capabilities:

Generate a structured workflow card from a Gmail message.

Classify workflow type.

Assign priority label/score.

Generate summary.

Recommend next action.

Suggest a reply.

Suggest a calendar action.

Generate autopilot confidence and minutes saved.

Store AI output on triage_items.

The analyze API persists AI output including workflow type, priority, summary, recommended action, suggested reply, calendar action, autopilot score, timeline, model, timestamp, and output version.

Current architectureHigh-level architecture:

Next.js App Router frontend and API routes.

React client components for interactive dashboards.

Supabase for auth/session.

Drizzle ORM + Postgres for app database.

Corsair for Gmail and Calendar operations.

OpenAI SDK for AI workflow card generation.

Server route handlers for sync, analysis, execution, and command planning.

Proxy middleware for route protection.

The tech stack is visible in package.json: Next 16, React 19, Supabase, Drizzle, OpenAI SDK, Zod, Tailwind, shadcn/Radix-style UI, cmdk, date-fns, Sonner, and Zustand.

Overall product maturityHackathon demo maturity: good.

Production SaaS maturity: early.

The product demonstrates the end-to-end idea, but still needs production reliability, verified integration state, richer data persistence, tests, observability, billing, onboarding completion, and more robust AI/agent behavior.

Feature InventoryFeature	Status	Completion %	Files Involved	NotesAuthentication	Mostly built	80%	lib/auth/session.ts, app/login/actions.ts, proxy.ts	Server session/profile lifecycle exists; route protection exists. Needs stronger production rate limiting and full auth QA.Protected routes	Built	85%	proxy.ts	Protects dashboard, onboarding, reset, workflows, Gmail, Calendar, AI, Activity, Settings, Admin. Admin check partly server-side.Admin users page	Partial	45%	app/admin/users/page.tsx, lib/auth/session.ts	Admin guard exists; page is likely basic visibility, not management.Google OAuth via Corsair	Partial	65%	app/api/corsair/connect/route.ts, app/integrations/connected/route.ts	Connect link exists; redirect exists; but success is assumed and both Gmail/Calendar are marked connected.Corsair client abstraction	Mostly built	75%	lib/corsair/client.ts, lib/corsair/run.ts	SDK/REST abstraction exists, but needs hardening against Corsair operation changes and verified connection status.Corsair connection status	Partial	55%	app/api/corsair/status/route.ts, db/models/corsairConnection.model.ts	Returns remote status but does not reconcile remote status into local flags.Gmail connect CTA	Built	80%	app/gmail/page.tsx, components/gmail/GmailDashboard.tsx	Shows Connect Gmail if not connected and Sync Gmail if connected.Gmail sync	Mostly built	75%	app/api/triage/generate/route.ts, lib/triage/gmail-ingestion.ts, lib/corsair/gmail.ts	Imports up to 25 recent messages and dedupes. Needs pagination, details/thread view, error recovery.Gmail detail view	Partial	45%	components/triage/TriageDashboard.tsx, components/gmail/GmailDashboard.tsx	Dashboard has detail flow; Gmail page itself only lists basic message cards.Draft Gmail replies	Built MVP	70%	lib/corsair/gmail-actions.ts, lib/actions/execute-workflow.ts	Creates Gmail drafts, not sends emails, which is safer. Needs draft preview routing and better result display.Send emails	Not built	0%	db/models/actionLog.model.ts, types/*	Types mention send_email_reply, but no actual send flow found. Good to avoid for demo safety.Calendar connect CTA	Built	80%	app/calendar/page.tsx, components/calendar/CalendarDashboard.tsx	Shows Connect Calendar if not connected and Sync Calendar if connected.Calendar sync	Mostly built	70%	app/api/calendar/sync/route.ts, lib/corsair/calendar-sync.ts	Syncs upcoming events to client response, marks connected, but does not persist events.Calendar month UI	Built MVP	75%	components/calendar/CalendarDashboard.tsx	Proper month grid, selected day, event count, month navigation.Calendar event creation	Mostly built	75%	app/api/calendar/events/route.ts, lib/corsair/calendar.ts, CalendarDashboard.tsx	Creates Google Calendar events through Corsair with reminders. Needs persistence and better timezone handling.Calendar event reminders	Partial	65%	CalendarDashboard.tsx, lib/corsair/calendar.ts	UI collects reminder minutes; create API supports popup reminders. Needs notification UX and defaults/preferences.Calendar event updates	Not production	20%	CalendarDashboard.tsx	Edit updates only local UI and explicitly says Google Calendar update support is next.Calendar summary	Partial	45%	CalendarDashboard.tsx	Summary is deterministic UI logic, not AI-powered.AI planner	Built MVP	75%	lib/ai/planner.ts, lib/ai/schemas.ts, app/api/triage/analyze/route.ts	OpenAI JSON generation and validation exist. Needs evals, retries, model/version strategy.AI workflow cards	Mostly built	75%	components/triage/TriageDashboard.tsx, db/models/triageItem.model.ts	DB schema supports rich AI card fields. UI is large but functional.AI Lab page	Partial	55%	app/ai/page.tsx, components/ai/AiWorkflowDashboard.tsx	Separate AI page exists, but likely mostly wraps triage items rather than a full AI workspace.Command palette	Partial	60%	components/command/CommandPalette.tsx, app/api/agent/route.ts	UI exists with plan/confirm. Backend parser is heuristic, not true LLM agent.Natural-language agent	Partial	45%	app/api/agent/route.ts	Can infer simple schedule/draft commands; not robust. Uses regex/date heuristics.Safe execution confirmation	Built MVP	80%	app/api/execute/route.ts, lib/actions/execute-workflow.ts	Requires confirmed: true and writes action logs.Activity logs	Partial	65%	db/models/actionLog.model.ts, app/activity/page.tsx	Logs display exists. No ordering by date in query, no deep result/error detail page.Workflows page	Partial	50%	app/workflows/page.tsx	Page exists but needs stronger workflow management semantics.Dashboard	Mostly built	75%	app/dashboard/page.tsx, components/triage/TriageDashboard.tsx	Dashboard provides strong guided MVP. Needs fewer overloaded interactions and clearer empty states.Gmail page	Partial	65%	app/gmail/page.tsx, components/gmail/GmailDashboard.tsx	Good separation, but lacks full thread/message detail on Gmail page.Calendar page	Mostly built	70%	app/calendar/page.tsx, components/calendar/CalendarDashboard.tsx	Good visual calendar; missing persistence and true event update/delete.Settings	Mostly static	35%	app/settings/page.tsx	Shows theme guidance and preference cards but no actual save/update controls.User preferences	Partial backend	35%	db/models/userPreference.model.ts, lib/auth/session.ts	Preference row is created, but settings UI does not modify it.Demo/guest mode	Partial	55%	app/login/actions.ts, components/auth/AuthForm.tsx	Guest mode exists, but demo data/seeded demo journey appears incomplete.Notifications	Not built	5%	Calendar reminders only	No in-app notifications, email notifications, or scheduled reminders.Analytics	Not built	10%	Dashboard metrics only	Metrics are simple counts, no analytics page or trend tracking.Billing/pricing	Static only	25%	app/pricing/page.tsx	Pricing page exists; no Stripe/billing enforcement.Briefing page	Missing	0%	N/A	Strong candidate for hackathon: daily AI briefing.Background jobs	Missing	0%	N/A	No scheduled sync, queue, worker, or cron.Webhooks	Missing	0%	Types mention webhooks but no implementation.Testing	Weak	20%	package.json	Lint/build exist; no unit/e2e/integration tests.Database schema	Mostly built	75%	db/models/, supaBase/migrations/	Good initial schema. Missing calendar events table, notification table, audit details.Environment tooling	Mostly built	70%	.env.example, config/env.ts, scripts	Good DX helpers, but production env validation could be stricter.Responsive app shell	Mostly built	80%	components/app/AppShell.tsx	Static sidebar on desktop and mobile nav exist.

What Is Fully Finished?Very few features are truly production-ready. Several are demo-ready, but production-ready is a higher bar.

3.1 App routing and basic protected shellStatus: closest to production-ready.

Why complete:

Authenticated app routes are protected.

Auth pages redirect authenticated users.

The app shell has a desktop sticky sidebar and mobile navigation.

Core app destinations are discoverable.

Relevant files: proxy.ts, components/app/AppShell.tsx.

Remaining risks:

Admin authorization relies on server page guard, while proxy only checks user existence.

No middleware-level role check for /admin.

No full e2e tests.

Missing edge cases:

Expired sessions.

Supabase outage.

Deep links with query params.

Mobile keyboard/safe area behavior.

3.2 Basic database models for triage/action logs/connectionsStatus: mostly complete for MVP.

Why complete:

triage_items contains Gmail metadata, AI output fields, execution fields, status, errors, and indexes.

action_logs stores user, triage item, action type, payload, status, result, and error.

corsair_connections stores per-user tenant/account state and sync timestamps.

Remaining risks:

No calendar events table.

No notification table.

No job table.

No retries/dead-letter queue.

No detailed status machine for workflow execution.

Missing edge cases:

Duplicate action execution.

Partial success recovery.

Stale Corsair tenant state.

Cross-device calendar sync visibility.

3.3 Lint/build healthStatus: complete for current code snapshot.

Why complete:

npm run lint passes.

npm run build passes.

Next route output confirms app/API routes compile.

Remaining risks:

Passing build is not the same as runtime correctness.

No tests validate real Gmail/Calendar/OpenAI behavior.

Build may not exercise all runtime env permutations.

What Is Partially Built?4.1 Authentication and onboardingCurrent state:

Supabase auth, profile creation, guest mode, and route protection exist.

Implemented:

Profile upsert and preferences/counters bootstrap.

requireUser and requireAdmin.

Proxy route protection.

Missing:

Persisted onboarding completion.

Strong production rate limiting.

Auth e2e test coverage.

Better handling of email confirmation edge cases.

Role-management UI.

Estimated completion: 75–80%.

4.2 Corsair connection flowCurrent state:

Connect link generation and redirect handling exist.

Implemented:

Safe returnTo validation.

Corsair connect link creation.

Redirect back into the app.

Missing:

Actual verification that Gmail and Calendar were connected.

Separate Gmail-only or Calendar-only connection state.

Remote status reconciliation.

Error page for failed OAuth.

Webhook or callback payload verification.

Big issue: /integrations/connected sets both gmailConnected and calendarConnected to true unconditionally.

Estimated completion: 60–65%.

4.3 Gmail syncCurrent state:

Functional MVP for recent messages.

Implemented:

Lists Gmail messages through Corsair.

Hydrates messages if needed.

Normalizes headers/snippet/body preview.

Imports into triage_items with dedupe.

Missing:

Pagination.

Full thread view.

Attachments.

Label/category filters.

Search.

Manual refresh state.

Handling deleted/archived messages.

Background sync.

Estimated completion: 70–75%.

4.4 Calendar sync and calendar UICurrent state:

Visually good and useful for demo.

Implemented:

Month grid.

Month navigation.

Day summary panel.

Sync button.

Add event form.

Reminder minutes.

Local edit UI.

Calendar sync currently fetches upcoming events from Google Calendar via Corsair and returns them to the client.

Missing:

Persist synced events in DB.

True Google Calendar update.

Delete/cancel event.

Recurring events support.

Timezone defaults per user.

Conflict detection.

AI calendar summary endpoint.

Calendar event details page/drawer.

Multi-calendar support.

The local edit limitation is explicitly visible in UI logic: it updates the TriageOS view and says Google Calendar update support is next.

Estimated completion: 65–70%.

4.5 AI workflow plannerCurrent state:

Good MVP AI feature.

Implemented:

OpenAI call.

JSON response format.

Zod validation.

Stores AI result in DB.

Missing:

AI evals.

Retry/backoff.

Model fallback.

Token/cost tracking.

Streaming UX.

Guardrails against bad calendar times.

Prompt versioning beyond simple output version.

User preference-aware AI tone/timezone.

Estimated completion: 70–75%.

4.6 Workflow executionCurrent state:

Strong MVP.

Implemented:

Requires explicit confirmation through API schema.

Creates calendar events.

Creates Gmail drafts.

Logs actions.

Updates triage item status to completed or failed.

Missing:

Idempotency keys.

Retry handling.

Transaction boundary around DB + external calls.

Partial success recovery UI.

Ability to undo/cancel.

No send email support by design.

Estimated completion: 70%.

4.7 Command palette / natural language command centerCurrent state:

Great for demo polish, but shallow technically.

Implemented:

Cmd/Ctrl+K launcher.

Example prompts.

Plan first, confirm second.

Can create calendar events and Gmail drafts.

Missing:

LLM-backed interpretation.

Context from user’s actual Gmail/Calendar.

Timezone handling.

Clarifying questions.

Conflict detection.

Multi-step memory.

Rich result UI.

The backend currently uses regex/heuristic parsing for email extraction, date/time inference, and duration inference.

Estimated completion: 45–55%.

4.8 Settings and personalizationCurrent state:

Mostly static.

Implemented:

Visual theme image guidance.

Static preference cards.

Missing:

Saveable preferences.

Upload theme image.

Default timezone.

Default meeting duration.

Reply tone control.

Notification preferences.

Connected account management.

Estimated completion: 30–35%.

Missing FeaturesRecommended implementation orderPriority	Missing Feature	Why Important1	Connection verification/reconciliation	Prevents users seeing “connected” when Corsair plugin is not actually usable.2	Calendar event persistence table	Needed for stable calendar page, summaries, updates, analytics, and offline rendering.3	Real Calendar update/delete operations	User explicitly wants edit/add/reminder. Add exists; update/delete must follow.4	Gmail detail/thread page or drawer	Users need to read full email context before trusting AI.5	AI daily briefing page	High demo impact: “Here’s your day, what needs attention, what I can handle.”6	AI calendar summary endpoint	Current summary is deterministic; AI-powered summary would feel much smarter.7	Background sync / cron	Daily-use product requires sync without manual clicks.8	Notifications/reminders	Needed for user retention and meeting workflows.9	Idempotency and retry system	Prevent duplicate calendar events/drafts and recover failures.10	Tests + CI	Needed before claiming production quality.11	Settings persistence	Make default duration, tone, timezone, theme actually work.12	Observability	Logs, metrics, error tracking, external API failure visibility.13	Billing/limits	Needed for startup readiness, not hackathon-critical.14	Webhooks	Useful for real-time Gmail/Calendar updates.15	Analytics page	Useful post-MVP: time saved, actions completed, AI accuracy.

User Experience Flow AuditStep 1: New UserWhat works:

Auth pages exist.

Supabase-backed profile creation exists.

Guest mode appears supported.

What breaks / risk:

Guest mode depends on Supabase anonymous sign-ins.

Email confirmation can block hackathon demos if Supabase is not configured correctly.

No polished first-run checklist state.

Improve:

Add demo seed mode.

Add onboarding completion flag.

Add “Try with sample inbox” path.

Step 2: OnboardingWhat works:

Onboarding route exists and likely includes Corsair connection status.

App shell and dashboard guide users toward the main flow.

What feels unfinished:

Onboarding is not tracked as complete.

It does not appear to enforce or verify separate Gmail/Calendar plugin states.

Improve:

Add a 3-step onboarding checklist:

Connect Google.

Sync first Gmail messages.

Generate first AI card.

Step 3: Connect GoogleWhat works:

Gmail and Calendar pages show connect CTAs when not connected.

Connect endpoint redirects back to Gmail/Calendar depending on returnTo.

What breaks:

/integrations/connected marks both Gmail and Calendar connected whether or not both were actually authorized.

Improve:

Use remote Corsair status to verify Gmail and Calendar separately.

Add a connection diagnostics card.

Step 4: Sync GmailWhat works:

Dedicated Gmail page has Connect/Sync button.

Sync imports recent Gmail messages.

Messages become triage items.

What feels unfinished:

Gmail page does not show full thread detail.

No search/filter.

No pagination.

No background sync.

Improve:

Add Gmail detail drawer with original email body, AI suggestions, and “generate workflow” CTA.

Add filters: unread, meeting requests, urgent, newsletters.

Step 5: Sync CalendarWhat works:

Dedicated Calendar page has Connect/Sync button.

Calendar month UI is much better now.

Add event and reminder UI exists.

What breaks / risk:

Events are not persisted.

Sync only requests up to 25 upcoming events.

Edit is local-only, not Google Calendar update.

Improve:

Persist synced calendar events.

Add update/delete Corsair actions.

Add month range sync instead of only upcoming event count.

Step 6: AI PlanningWhat works:

AI card generation exists and persists structured output.

User must explicitly generate AI; no silent AI mutation.

What feels unfinished:

No AI quality score/eval.

No streaming or conversational refinement.

No AI summary for calendar yet.

Improve:

Add “Why this suggestion?” explanation.

Add regenerate with tone/date constraints.

Add daily briefing.

Step 7: Create EventsWhat works:

Calendar event creation through Corsair exists.

Reminders are supported in create payload.

Workflow execution can create events from AI card suggestions.

What breaks / risk:

No conflict detection.

No idempotency.

Timezone default is often UTC.

No update/delete.

Improve:

Use user timezone preference.

Add conflict warning before creation.

Store event IDs and allow edit/cancel.

Step 8: Draft EmailsWhat works:

Draft creation exists and is safer than sending automatically.

Drafts are logged.

What feels unfinished:

No direct link to Gmail draft.

No “open in Gmail” result card.

No send flow, which is fine for demo but incomplete for product.

Improve:

Show draft ID/result after execution.

Add “copy reply” fallback.

Add optional send later only after strong safety work.

Step 9: Daily UsageWhat works:

Dashboard, Activity, Gmail, Calendar, AI, Workflows, Settings pages exist.

Product shape is becoming clear.

What feels unfinished:

No background refresh.

No notifications.

No daily briefing.

No “today’s priorities” queue.

No analytics/trends.

Improve:

Add daily briefing as the product’s center.

Add “Today” page or transform dashboard into daily operating room.

Technical Debt AuditArea	Severity	Finding	RecommendationConnection state	Critical	Connected route marks both Gmail/Calendar connected without verification.	Verify remote Corsair plugin states before updating DB.Calendar edit	High	Calendar edit updates local state only.	Implement Google Calendar update endpoint and Corsair helper.Calendar persistence	High	Synced calendar events are returned to UI but not stored.	Add calendar_events table with external ID unique constraint.Agent quality	High	Natural language agent uses heuristic parsing, not OpenAI/tool calling.	Use LLM structured planning with confirmation schema.Idempotency	High	Execution can create duplicate external actions on repeated submit.	Add idempotency keys per triage item/action type.Timezone	High	Calendar defaults to UTC in multiple flows.	Store user timezone and use it everywhere.Large components	Medium	CalendarDashboard and TriageDashboard are very large.	Split into hooks, panels, cards, dialogs.Settings	Medium	Settings page displays values but does not persist edits.	Wire to user_preferences.Activity query	Medium	Activity page limits 30 logs but does not explicitly order by newest in inspected code.	Add orderBy(desc(actionLogs.createdAt)).Error handling	Medium	API routes generally return raw error messages.	Normalize public errors; log private details.Rate limiting	Medium	In-memory limiter is not distributed.	Use Redis/Upstash/Supabase-based limiter for production.Tests	High	No automated unit/e2e/integration tests.	Add Playwright smoke tests and server unit tests.Background jobs	Medium	Manual sync only.	Add cron/scheduled sync or queue worker.Observability	Medium	No structured logging, tracing, Sentry, metrics.	Add Sentry/PostHog/structured logs.Webhooks	Low/Medium	Webhooks appear in types but no implementation.	Add after core manual flow is stable.Type safety	Medium	Some API payloads use broad records and unknown.	Add shared API schemas/types.Security	Medium	CSRF protection is not obvious for POST APIs.	Confirm same-site cookie protections and add CSRF token if needed.Product copy	Low	Some UI says “Cmd K soon” while command palette exists.	Update copy to “Cmd/Ctrl+K”.Naming/tooling	Low	App package name is still my-app.	Rename package to triageos.

Architecture Diagram8.1 Frontend architectureThe actual shell nav includes Dashboard, Gmail, Calendar, AI Lab, Workflows, Activity, and Settings.

8.2 Backend architecture8.3 OAuth / connection flowRisk: the current connected route marks both Gmail and Calendar connected unconditionally.

8.4 Gmail flowGmail import writes normalized messages into triage_items and dedupes by user/provider/message ID.

8.5 AI flow8.6 Calendar flowCalendar sync fetches events; calendar creation creates events with reminders through Corsair.

8.7 Workflow execution flowThe execute API requires confirmed: true, and the workflow writes action logs for calendar and draft actions.

Hackathon Readiness ScoreCategory	Score / 10	NotesProduct Vision	8.5	Clear, useful, demo-friendly idea: emails → AI workflow cards → safe execution.User Experience	7.0	Much improved with separate Gmail/Calendar/AI pages, but onboarding and connection verification still rough.AI Innovation	7.0	AI workflow cards are good; command agent is still heuristic.Technical Execution	7.0	Strong full-stack progress; build passes; integrations exist. Missing tests/reliability.Demo Readiness	7.5	Can demo core flow if environment and Corsair are configured. Needs seeded fallback.Reliability	5.5	No tests, no retries, optimistic connection state, no idempotency.Design	7.5	App shell and calendar UI are now much more engaging. Some pages remain static/shallow.Overall hackathon readiness score: 7.1 / 10

Hackathon readiness percentage: 72%

RoadmapA. Next 24 hours planPriority: make the demo reliable and understandable.

Fix connection verification

Do not mark Gmail/Calendar connected unless Corsair remote status confirms it.

Show separate Gmail/Calendar connection badges.

Persist calendar events

Add calendar_events table.

Upsert synced events.

Render calendar page from DB plus fresh sync.

Implement real calendar update/delete

Add Corsair update/delete operation helpers.

Replace local-only edit with real update.

Add Gmail detail drawer

Full subject, sender, body preview, received time.

Generate AI from drawer.

Show suggested reply and action.

Add Daily Briefing page or dashboard module

“Today’s meetings.”

“Emails needing action.”

“AI can draft these.”

“Potential conflicts.”

Add demo seed fallback

If Corsair/OpenAI is missing, demo can still show sample data.

Add clearer success states

After connect, show “Connected — now sync Gmail/Calendar.”

After sync, show what changed.

Update copy

Remove confusing “Cmd K soon” copy because command palette exists.

B. Next 3 days planAdd tests:

API schema tests.

AI planner mocked tests.

Gmail/calendar normalization tests.

Playwright happy path.

Add reliability:

Idempotency keys.

Retry/error states.

Action log details.

Add user settings:

Timezone.

Reply tone.

Meeting duration.

Theme image preference.

Improve command palette:

Use AI structured planning.

Ask clarifying questions.

Use actual calendar availability.

Add background sync:

Scheduled Gmail sync.

Scheduled calendar refresh.

Add observability:

Sentry.

Structured logs.

API timing metrics.

C. Hackathon demo planA strong demo script should be:

User signs in.

Connects Google through Corsair.

Goes to Gmail page.

Syncs Gmail.

Opens a message.

Generates AI workflow card.

Shows suggested reply + calendar action.

Confirms execution.

Shows Gmail draft created and Calendar event created.

Goes to Activity page to prove transparency.

Goes to Calendar page and shows event on month grid.

Opens command palette and says: “Schedule a sync with X tomorrow and draft confirmation.”

Confirms plan.

Ends with daily briefing vision.

D. Post-hackathon startup roadmapPhase 1: Trust and reliabilityVerified connection state.

Persistent calendar/events.

Tests and CI.

Observability.

Idempotent execution.

User timezone.

Phase 2: Daily assistantDaily briefing.

Background sync.

Notifications.

Inbox priorities.

Calendar conflict detection.

Follow-up reminders.

Phase 3: Team/productizationMulti-workspace support.

Billing.

Usage limits.

Admin dashboard.

Team analytics.

Shared templates.

Phase 4: Advanced AILong-term memory.

User preference learning.

Multi-step tool execution.

Clarifying questions.

Evaluations and feedback loop.

Confidence-based automation.

If Only 12 Hours Remain Before JudgingThese are the top 10 highest-impact improvements, ranked.

Add a reliable demo mode / seeded sample dataIf Corsair, Google verification, or OpenAI fails during judging, the demo must still work.

Impact: huge.

Fix connection verification UXRight now the app can say both Gmail and Calendar are connected after the return route. That is risky.

Impact: huge.

Add Gmail detail drawerJudges need to see the original email, AI reasoning, suggested reply, and suggested event in one place.

Impact: huge.

Add Daily Briefing card/pageThis is the “wow” feature:

“Here’s what matters today. Here are the emails that need action. Here are meetings to prepare for. Here are drafts/events I can create.”

Impact: huge.

Make Calendar event edit real or hide edit wordingThe current edit flow is local-only. If judges notice, trust drops.

Impact: high.

Add “Open created draft/event” result displayAfter execution, show IDs/links/clear confirmation.

Impact: high.

Add idempotency protection for executionAvoid duplicate calendar events or drafts if the user double-clicks.

Impact: high.

Improve command palette result polishThe command palette already looks cool, but backend is simple. Make the plan/result feel impressive and transparent.

Impact: medium-high.

Add one Playwright happy-path smoke testEven one test improves confidence:

login/session mocked or guest

dashboard loads

Gmail page renders

Calendar page renders

Impact: medium.

Add connection diagnostics panel in SettingsShow:

Supabase configured

Corsair tenant ID

Gmail connected

Calendar connected

Last sync times

OpenAI configured

Impact: medium.

Brutally Honest Final AssessmentWhat is impressiveThe product vision is strong.

The repo has real full-stack substance.

The app compiles.

The UI has moved from basic to genuinely demoable.

Gmail sync, AI planning, draft creation, calendar creation, and action logging form a coherent story.

The “safe execution” principle is good: drafts instead of auto-send, confirmation before action.

What is not yet production-gradeConnection truth is not reliable enough.

Calendar persistence is missing.

Calendar editing is not real.

The agent is more of a command parser than an AI agent.

No test suite.

No background jobs.

No idempotency.

No observability.

Settings are mostly visual/static.

Error recovery is not strong enough for real users.

Final percentagesReadiness Type	EstimateOverall project completion	58%MVP completion	74%Hackathon readiness	72%Startup readiness	32%My recommendationFor the next implementation sprint, do not add more random pages. The app already has enough surface area.

Instead, make the existing core loop undeniable:

Connect → Sync Gmail → Open email detail → Generate AI → Confirm draft/event → See result in Calendar + Activity → Daily Briefing summarizes everything.

That is the product. Everything else should support that loop.

============================

SummaryRe-audited the current repository and confirmed the P0 gaps still existed before implementation: optimistic Gmail/Calendar connection state, local-only calendar editing, missing Daily Briefing page, missing AI calendar summary endpoint, and missing demo fallback mode.

Fixed Gmail/Calendar connection state handling by adding a Corsair status resolver that parses remote plugin state, avoids blindly marking both integrations connected, and reconciles verified remote state back into corsair_connections.

Preserved the post-OAuth user experience by allowing Gmail and Calendar pages to show sync controls after a successful OAuth return while clearly asking the user to verify the integration through sync.

Added hackathon-safe demo fallback mode behind TRIAGEOS_DEMO_MODE, including sample Gmail messages, calendar events, and deterministic AI workflow cards for judging/demo resilience.

Wired demo fallback into Gmail ingestion, AI planning, and Calendar sync so the core demo can still run when Corsair/OpenAI are unavailable locally.

Replaced local-only Calendar editing with a real PUT /api/calendar/events route and Corsair googlecalendar.api.events.update helper; the Calendar UI now calls the update API and reports a real Google Calendar update through Corsair.

Added AI Calendar Summary through POST /api/calendar/summary, using OpenAI when configured and a deterministic fallback otherwise.

Added a protected /briefing Daily Briefing page with demo-path guidance, action metrics, AI-ready count, and Calendar readiness/preview.

Added the Daily Briefing route to the app navigation and route protection.

Committed the completed P0 work on the current branch with commit 53c2935 and created a PR titled “Close P0 hackathon workflow gaps”.

Implementation Backlog Generated Before CodingTask	Category	Impact	Effort	PriorityVerify Gmail/Calendar connection state from Corsair remote status	Critical Bug	Very High	Medium	P0Keep Sync controls visible after OAuth return	Critical Bug / UX Improvement	Very High	Low	P0Replace local-only Calendar edit with real Google Calendar update	Critical Bug / Missing Feature	Very High	Medium	P0Add Daily Briefing page	Missing Feature / Demo Readiness	Very High	Medium	P0Add AI Calendar Summary	AI Feature / Demo Readiness	High	Medium	P0Add demo fallback for Gmail/Calendar/AI	Demo Readiness / Reliability	Very High	Medium	P0Persist synced Calendar events in DB	Reliability / Missing Feature	High	High	P1Add Gmail detail/thread drawer on Gmail page	UX Improvement	High	Medium	P1Add idempotency for execution actions	Reliability	High	Medium	P1Add Playwright happy-path smoke test	Reliability	Medium	Medium	P1Add settings persistence for timezone/reply tone/default duration	Missing Feature	Medium	Medium	P2Add background sync / cron	Missing Feature	Medium	High	P2Add billing/team/enterprise features	Startup Feature	Low for hackathon	High	P3Step 1 — Incomplete Features RecheckedFeature	Current Implementation	Missing Functionality Before This Pass	Files Involved	Dependencies	EstimateGmail/Calendar connection state	Local DB flags plus Corsair status endpoint	Remote reconciliation; no blind connected state	lib/corsair/status.ts, app/integrations/connected/route.ts, app/api/corsair/status/route.ts	Corsair tenant status	Completed P0Connect → Sync handoff	Gmail/Calendar pages showed buttons based only on DB state	Sync controls immediately after OAuth return	app/gmail/page.tsx, app/calendar/page.tsx, Gmail/Calendar dashboards	Next search params	Completed P0Calendar editing	Local state update only	Real Google Calendar update	app/api/calendar/events/route.ts, lib/corsair/calendar.ts, CalendarDashboard.tsx	Corsair Calendar update op	Completed P0Daily Briefing	Missing	Dedicated route and navigation	app/briefing/page.tsx, AppShell.tsx, proxy.ts	Existing triage/calendar state	Completed P0AI Calendar Summary	Deterministic client summary only	AI-backed summary API	app/api/calendar/summary/route.ts, CalendarDashboard.tsx	OpenAI, fallback	Completed P0Demo fallback	No fallback layer	Demo data when Corsair/OpenAI unavailable	lib/demo/data.ts, Gmail ingestion, AI planner, Calendar sync	Env flag	Completed P0Calendar event persistence	Events are client state only	DB table/upsert	Not implemented yet	Migration + model	P1Gmail detail drawer	Dashboard detail exists; Gmail page is list-oriented	Full Gmail page detail	Not implemented yet	UI refactor	P1Execution idempotency	Confirmation required	Duplicate prevention	Not implemented yet	DB/action key	P1Step 2 — Ranked TasksP0 — Completed in this iterationFix incorrect Gmail/Calendar connection state.

Show Sync controls after OAuth return.

Replace local-only Calendar editing.

Add Daily Briefing page.

Add AI Calendar Summary.

Add demo fallback mode.

P1 — Recommended nextPersist Calendar events in DB.

Add Gmail detail drawer on /gmail.

Add execution idempotency.

Add happy-path Playwright smoke test.

Improve Activity log details and ordering.

P2 — Nice to have before final polishPersist settings: timezone, default duration, reply tone.

Add background sync.

Add notification/reminder preferences.

Add richer AI briefing with Gmail + Calendar context.

P3 — Post-hackathonBilling.

Team workspaces.

Enterprise admin controls.

Advanced analytics.

Step 3 — Roadmap StatusP0 Roadmap — Done✅ Connection truth and OAuth return UX.

✅ Real Calendar update path.

✅ AI Calendar summary.

✅ Daily Briefing.

✅ Demo fallback mode.

Next Recommended TaskThe next task should be P1: Persist Calendar events in the database.

Why:

It makes /calendar stable after refresh.

It supports briefing from real synced Calendar data.

It enables update/delete consistency.

It improves demo reliability because events do not disappear from UI state after reload.

Step 4 — P0 Task Completion Report

Connection state fixArchitecture

Added a resolver that extracts Gmail/Calendar plugin state from unknown Corsair status shapes.

/integrations/connected now updates DB flags only when remote state is verified.

/api/corsair/status now reconciles remote state when available.

Files modified

lib/corsair/status.ts

app/integrations/connected/route.ts

app/api/corsair/status/route.ts

Risk

Corsair status shape may still vary. The resolver is defensive, but once the exact status response is known, it should be tightened.

Status

Completed and build-verified.

Post-connect Sync controlsArchitecture

Gmail/Calendar pages now read connected=1 and verified=1/0 search params.

If OAuth returned but remote verification is not available, pages optimistically show Sync controls with a verification message.

Actual DB connection state is still only verified through remote status or successful sync.

Files modified

app/gmail/page.tsx

components/gmail/GmailDashboard.tsx

app/calendar/page.tsx

components/calendar/CalendarDashboard.tsx

Risk

A user may still see Sync after OAuth return even if they cancelled OAuth, but the next sync will fail clearly instead of permanently corrupting DB state.

Status

Completed and build-verified.

Calendar editingArchitecture

Added PUT /api/calendar/events.

Added updateCalendarEvent.

Calendar edit dialog now calls the update API instead of only mutating local state.

Files modified

app/api/calendar/events/route.ts

lib/corsair/calendar.ts

components/calendar/CalendarDashboard.tsx

Risk

The Corsair operation path is assumed as googlecalendar.api.events.update. If Corsair exposes a different operation name, this may need a path adjustment.

Status

Completed and build-verified.

Daily BriefingArchitecture

Added /briefing as a protected server-rendered page.

Uses current triage items, connection state, and demo Calendar events when demo mode is enabled.

Added to app sidebar and mobile nav.

Added to proxy protected route list.

Files modified

app/briefing/page.tsx

components/app/AppShell.tsx

proxy.ts

Risk

Briefing currently uses triage DB state and demo Calendar preview; once Calendar events are persisted, Briefing should use real synced Calendar rows.

Status

Completed and build-verified.

AI Calendar SummaryArchitecture

Added POST /api/calendar/summary.

Uses OpenAI JSON output when OPENAI_API_KEY is configured.

Falls back to deterministic summary when demo mode or no OpenAI key is available.

Calendar UI calls this endpoint from “Get summary”.

Files modified

app/api/calendar/summary/route.ts

components/calendar/CalendarDashboard.tsx

Risk

No streaming; no persisted summary; no evals yet.

Status

Completed and build-verified.

Demo Mode fallbackArchitecture

Added TRIAGEOS_DEMO_MODE=false to .env.example.

Added lib/demo/data.ts with demo Gmail messages, Calendar events, and AI card generation.

Gmail sync, Calendar sync, and AI planner use demo data when enabled.

Files modified

.env.example

lib/demo/data.ts

lib/triage/gmail-ingestion.ts

lib/corsair/calendar-sync.ts

lib/ai/planner.ts

Risk

Demo mode should stay off in production.

If enabled in a shared environment, sample data may appear for real users.

Status

Completed and build-verified.

Testing

✅ npm run lint

✅ npm run build

✅ git diff --check

✅ git status --short

✅ git log -1 --oneline

⚠️ node -e "require('playwright'); console.log('playwright available')" — Playwright is not installed in this repo/container, so I could not capture a local browser screenshot despite visible UI changes.

What Remains After P0P1 next recommended orderPersist Calendar events in DB

Add calendar_events model/migration.

Upsert results from /api/calendar/sync.

Render /calendar and /briefing from persisted events.

Add Gmail detail drawer on /gmail

Show full body preview, sender, recipients, AI action, and “Generate AI” CTA.

Add execution idempotency

Prevent duplicate calendar events/drafts if user double-clicks or retries.

Improve Activity page

Sort newest first.

Show expanded action payload/result/error.

Add one smoke test

Validate protected routes compile/render and P0 routes exist.

Current hackathon readiness after this pass: ~84–87%.

To reach 90%+, the next biggest win is persist Calendar events + Gmail detail drawer + idempotency.

Files (74)

.env.exampletriageos/.env.exampleNew

.gitignoretriageos/.gitignore+1-0

page.tsxtriageos/app/activity/page.tsxNew

page.tsxtriageos/app/admin/users/page.tsxNew

page.tsxtriageos/app/ai/page.tsxNew

route.tstriageos/app/api/agent/route.tsNew

route.tstriageos/app/api/calendar/events/route.tsNew

route.tstriageos/app/api/calendar/summary/route.tsNew

route.tstriageos/app/api/calendar/sync/route.tsNew

route.tstriageos/app/api/corsair/connect/route.tsNew

route.tstriageos/app/api/corsair/status/route.tsNew

route.tstriageos/app/api/execute/route.tsNew

route.tstriageos/app/api/triage/analyze/route.tsNew

route.tstriageos/app/api/triage/generate/route.tsNew

route.tstriageos/app/api/triage/route.tsNew

route.tstriageos/app/auth/callback/route.tsNew

page.tsxtriageos/app/auth/error/page.tsxNew

page.tsxtriageos/app/briefing/page.tsxNew

page.tsxtriageos/app/calendar/page.tsxNew

page.tsxtriageos/app/dashboard/page.tsxNew

page.tsxtriageos/app/forgot-password/page.tsxNew

globals.csstriageos/app/globals.css+87-3

page.tsxtriageos/app/gmail/page.tsxNew

route.tstriageos/app/integrations/connected/route.tsNew

layout.tsxtriageos/app/layout.tsx+5-18

actions.tstriageos/app/login/actions.tsNew

page.tsxtriageos/app/login/page.tsxNew

page.tsxtriageos/app/onboarding/page.tsxNew

page.tsxtriageos/app/page.tsx+257-54

page.tsxtriageos/app/pricing/page.tsxNew

page.tsxtriageos/app/register/page.tsxNew

page.tsxtriageos/app/reset-password/page.tsxNew

page.tsxtriageos/app/settings/page.tsxNew

page.tsxtriageos/app/signup/page.tsxNew

page.tsxtriageos/app/workflows/page.tsxNew

AiWorkflowDashboard.tsxtriageos/components/ai/AiWorkflowDashboard.tsxNew

AppShell.tsxtriageos/components/app/AppShell.tsxNew

UserButton.tsxtriageos/components/app/UserButton.tsxNew

AuthForm.tsxtriageos/components/auth/AuthForm.tsxNew

AuthShell.tsxtriageos/components/auth/AuthShell.tsxNew

PasswordForms.tsxtriageos/components/auth/PasswordForms.tsxNew

CalendarDashboard.tsxtriageos/components/calendar/CalendarDashboard.tsxNew

CommandPalette.tsxtriageos/components/command/CommandPalette.tsxNew

GmailDashboard.tsxtriageos/components/gmail/GmailDashboard.tsxNew

CorsairConnectionStatus.tsxtriageos/components/onboarding/CorsairConnectionStatus.tsxNew

TriageDashboard.tsxtriageos/components/triage/TriageDashboard.tsxNew

corsair.tstriageos/config/corsair.tsNew

env.tstriageos/config/env.tsNew

client.tstriageos/db/client.ts+21-4

execute-workflow.tstriageos/lib/actions/execute-workflow.tsNew

planner.tstriageos/lib/ai/planner.tsNew

schemas.tstriageos/lib/ai/schemas.tsNew

rate-limit.tstriageos/lib/auth/rate-limit.tsNew

session.tstriageos/lib/auth/session.tsNew

calendar-sync.tstriageos/lib/corsair/calendar-sync.tsNew

calendar.tstriageos/lib/corsair/calendar.tsNew

client.tstriageos/lib/corsair/client.tsNew

gmail-actions.tstriageos/lib/corsair/gmail-actions.tsNew

gmail.tstriageos/lib/corsair/gmail.tsNew

run.tstriageos/lib/corsair/run.tsNew

status.tstriageos/lib/corsair/status.tsNew

tenant.tstriageos/lib/corsair/tenant.tsNew

errors.tstriageos/lib/db/errors.tsNew

data.tstriageos/lib/demo/data.tsNew

admin.tstriageos/lib/supabase/admin.tsNew

client.tstriageos/lib/supabase/client.tsNew

server.tstriageos/lib/supabase/server.tsNew

gmail-ingestion.tstriageos/lib/triage/gmail-ingestion.tsNew

package.jsontriageos/package.json+3-1

proxy.tstriageos/proxy.tsNew

README.mdtriageos/public/theme/README.mdNew

corsair-callback-url.mjstriageos/scripts/corsair-callback-url.mjsNew

corsair-configure-google-oauth.mjstriageos/scripts/corsair-configure-google-oauth.mjsNew

env-loader.mjstriageos/scripts/env-loader.mjsNew
# FollowUpX — Single Workflow Guide

This document replaces the scattered .md notes. It explains what the app does and how the main workflows connect front end ↔ API ↔ background jobs.

## Core Domains
- **Leads CRM**: capture, view, update, status (won/lost with reasons), soft-delete, duplicate-phone guard, CSV import, AI recovery list, lead stats.
- **Tasks**: create/update, reschedule, snooze, cancel; complete with outcomes + optional follow-up task; AI suggestion on completion; reminders via Agenda; today dashboard (overdue/today/upcoming); task stats.
- **Activities**: auto-logged on task events; manual calls/notes; lead timeline; user timeline; stats by type/day; performedBy tracking.
- **Team**: invite/remove/update roles; assign leads (reassigns pending tasks, notifies, logs activity); team feed; team/member stats; plan/role middleware.
- **Scheduled Messages**: create/edit/cancel scheduled sends tied to leads/tasks; upcoming view; status/type stats.
- **Analytics/Reports**: overview trends, funnel, activity analytics, revenue metrics, dashboard quick stats, CSV export (leads/tasks/activities).
- **Notifications & Automations (Agenda)**: task reminders, daily overdue scan, daily summary, AI recovery scan, weekly report; in-app + optional email reminders.
- **Templates/WhatsApp**: template routes; WhatsApp deep link generation; template library UI.

## End-to-End User Flows
1) **Daily follow-up**
   - Dashboard/Today tab pulls tasks (`/tasks`, `/tasks/today`, `/tasks/stats`).
   - Click action item → Tasks module; complete/reschedule; reminders managed by Agenda; overdue alerts via daily scan.
2) **Lead lifecycle**
   - Create/import (CSV) with duplicate check.
   - View lead → see pending tasks + recent activities.
   - Update fields/status (won/lost) logs activity; soft delete cancels pending tasks.
3) **Activity logging**
   - Automatic: task create/complete/reschedule/cancel.
   - Manual: log call or note; timelines available per lead and per user; stats for analytics.
4) **Team collaboration**
   - Owner/manager invites members; assigns leads (pending tasks re-assigned); notifications + activity log; team feed/stats.
5) **Scheduled outreach**
   - Schedule messages against leads/tasks; edit/cancel; see upcoming (7-day) and status/type stats.
6) **Analytics + export**
   - Overview/funnel/activity/revenue dashboards; quick stats; CSV export for leads/tasks/activities.
7) **Alerts & summaries**
   - Agenda jobs send reminders, overdue notices, daily summary, AI recovery nudges, weekly report emails.

## Key Interfaces (client/src)
- `taskService.ts`, `activityService.ts`, `teamService.ts`, `leadService.ts`, `templateService.ts`, `scheduledMessageService.ts` (API wiring).
- `App.tsx`: tab router, Today & Dashboard action items, modals (task outcome, reschedule, add lead/task/note, log call, WhatsApp).
- `components/TodayDashboard.tsx`: overdue/today/completed task cards, quick actions.
- Calendar/list views for tasks; lead drawer with tasks/activities; mobile bottom nav.

## API Surface (backend/src)
- Routes: `/tasks`, `/activities`, `/team`, `/leads`, `/analytics`, `/scheduled-messages`, `/templates`, `/whatsapp`, `/auth`.
- Controllers implement the flows above; validation + auth middleware enforced.
- Agenda jobs defined in `config/agenda.js`; Mongo connection in `config/database.js`.

## Operational Notes
- Status values: tasks (`pending|completed|cancelled`), leads (staged, won/lost with timestamps), activities typed enums.
- Overdue logic: pending tasks with dueDate < today 00:00; flagged in stats/dashboard; overdueNotified gate for alerts.
- Reminders: scheduled per task; cancelled/rescheduled on updates; snooze creates new reminder.

## Suggested Next Steps
- If you need deeper API docs, run `npm run lint`/`npm test` as applicable, or generate Swagger from controllers.
- For onboarding new teammates, point them here first, then to service files for endpoints and data shapes.

# Habiv Full TeleCRM Clone Gap Document

## Purpose

This document defines what was demonstrated in the TeleCRM transcript and what is currently missing in Habiv (SpeedIQ) if the goal is to **clone TeleCRM end-to-end** and then add our own layer on top.

Scope source:
- `docs/comp-demo-transcript`
- Current app surface under `app/dashboard/*`, `app/api/projects/*`, and navigation

---

## Product Goal (Explicit)

Target is no longer "marketing-only parity".  
Target is:
1. Clone complete TeleCRM operating model.
2. Preserve and integrate existing Habiv strengths (WhatsApp Cloud API + Email marketing).
3. Add Habiv differentiators after base parity.

---

## TeleCRM Demo Capability Inventory

Below is everything materially shown or claimed in the transcript.

### 1) Lead Capture and Real-Time Ingestion
- Public form shared in webinar chat.
- Responses appear almost instantly inside a campaign/list.
- Used as live lead source before bulk actions.

### 2) Lead/Campaign List Operations
- Campaign-based lead list view.
- Filter and inspect actions.
- Bulk selection and bulk WhatsApp broadcast trigger.

### 3) WhatsApp Broadcast Operations
- Choose sender account.
- Choose template.
- Send to filtered audience.
- Delivery and reply-level reporting.
- Button-click outcome visibility (per CTA option).

### 4) Excel Import Wizard
- File upload.
- Column mapping from source columns to CRM fields.
- Data validation prompts before proceed.
- Campaign creation from import.

### 5) Lead Distribution Engine
- Distribute imported leads across team members.
- Adjustable percentage-based allocation.
- Mention of default round-robin and conditional assignment support.

### 6) CRM Core Lead Model
- Lead has stage/status.
- Fully customizable lead stages and lead fields.
- Source-aware lead movement and assignment.

### 7) Integrations Layer
- Large connector catalog claim (Facebook, Google Sheet, portals, etc.).
- Open API claim for unsupported sources.

### 8) Mobile App Field Workflow
- Full mobile app access to live data.
- Mobile-first telecaller workflow.

### 9) Calling Workflow (SIM-based)
- Click-to-call from lead on mobile.
- Outbound dialing without saving contact.
- Auto-call logging in lead timeline.
- Auto duration capture.
- Call feedback and notes.
- Inbound/outbound/missed tracking.
- Call recording attachment (device-dependent).

### 10) Follow-Up/Task Workflow
- Create call follow-up tasks with date/time.
- Reminder notes.
- Reminders on web, mobile, push notification.
- One-click action from reminder.

### 11) WhatsApp 1:1 Tracking in Timeline
- Per-lead WhatsApp activity visible in lead history.
- Reply tracking appended to same activity history.
- Positioning includes "individual telecaller WhatsApp tracking".

### 12) Team Reporting and Leaderboards
- Team-level call count, total duration, sales value.
- Date range granularity (day/week/month/year).
- Hourly report charts.
- Individual caller breakdown.

### 13) Lead Analytics / Business Intelligence Views
- Smart charting by stage, assignee, lost reason, source.
- Percentage and grouped views.
- Tabular and pie/bar options.
- Export chart/report.

### 14) Report Builder and Export Pipeline
- Configurable activity report generation.
- Select activity type (call/whatsapp/status/etc.).
- Select fields, create named config.
- Async report generation and download.

### 15) WhatsApp API Admin + Broadcast Reports
- Centralized chat inbox on API number.
- Pending/intervened filtering.
- Broadcast report drill-down (delivery/read/replies/buttons).

### 16) Conversion API + Cloud Telephony Claims
- Meta/Google conversion APIs (claimed).
- Cloud telephony as add-on for queue/reroute use cases.

---

## Habiv Current Capability Snapshot (Observed)

### Strong Areas Already Built
- WhatsApp Cloud API onboarding and account settings.
- WhatsApp templates and template sync flows.
- WhatsApp campaigns (create, schedule, send) with recipient stats.
- WhatsApp live chat (business number flow).
- Contact management (WhatsApp contacts + email subscribers).
- CSV import entry points.
- Email marketing (templates, subscribers, campaigns).
- Basic analytics for WhatsApp/email delivery.
- Team/project structure and settings framework.

### Positioning Reality Today
Habiv behaves like a **WhatsApp + Email marketing platform**, not a complete tele-sales CRM operating system.

---

## TeleCRM vs Habiv Gap Matrix

Status legend:
- `Complete` = materially present
- `Partial` = some foundation exists but not equivalent
- `Missing` = absent for practical parity

| Area | TeleCRM Demo Expectation | Habiv Status | Gap Level |
|---|---|---|---|
| Public lead capture forms | Native form -> live lead sink | No first-class form capture product surfaced | Missing |
| Lead entity with CRM lifecycle | Lead stages, owner, timeline, reasons | Contacts/subscribers model, not full lead lifecycle | Missing |
| Custom lead stages/fields | Full customization | Tags/settings exist, but no full lead schema builder | Missing |
| Lead assignment automation | Round robin + conditional + % split | No equivalent assignment engine | Missing |
| Excel mapping wizard | Upload + map + validate + import pipeline | CSV import exists, mapping wizard parity unclear/absent | Partial |
| Import-to-campaign flow | Immediately create/attach campaign after import | Campaigns exist, but integrated import orchestration incomplete | Partial |
| Mobile telecaller app | Full data + actions on mobile | No native mobile app surface in repo | Missing |
| SIM click-to-call | Native call initiation from app | No telephony mobile integration shown | Missing |
| Call logging + duration | Auto timeline entries | No call activity system for CRM leads | Missing |
| Call recording attachments | Device-dependent auto recording ingestion | No pipeline shown | Missing |
| Call feedback/notes | Post-call structured logging | No dedicated call feedback module | Missing |
| Follow-up tasks/reminders | Timed reminders across channels | No reminder/task module with this workflow | Missing |
| Lead activity timeline | Calls + WhatsApp + notes unified | WhatsApp conversation exists, but no full lead timeline model | Partial |
| Personal WhatsApp sync tracking | Telecaller-level WhatsApp tracking | Current model is business API inbox flow | Missing |
| Team call leaderboard | Calls, duration, sales KPI by rep | No call leaderboard subsystem | Missing |
| BI smart views | Stage/source/lost reason grouped analytics | Delivery analytics only | Missing |
| Configurable report builder | Activity-type + field picker + async export | No equivalent configuration-driven report builder surfaced | Missing |
| Broadcast drill-down depth | Delivery/read/reply/button-click contact-level detail | Campaign stats exist; deep per-button analytics unclear | Partial |
| Native integrations catalog | Many plug-and-play connectors | No broad connector marketplace seen | Missing |
| Open API ingestion framework | Generic endpoint strategy for arbitrary sources | APIs exist, but no explicit customer-facing ingestion framework | Partial |
| Conversion API support | Meta/Google CAPI claim | Not surfaced as product feature | Missing |
| Cloud telephony add-on | Queue, reroute, missed-call handling | Not present | Missing |

---

## Missing Modules Required for True Clone

These are the major systems to build for full parity.

### A. CRM Core
1. Lead object model (separate from contact/subscriber where needed).
2. Custom fields framework (typed fields, validation, display rules).
3. Stage/pipeline management.
4. Lead ownership and reassignment.
5. Lost reason and outcome taxonomy.

### B. Lead Ingestion and Assignment
1. Public forms module.
2. Universal source ingestion adapters.
3. Excel/CSV mapping wizard with saved mappings.
4. Assignment engine:
   - round robin
   - weighted/percentage split
   - conditional routing (field/source/product/geo)

### C. Telecalling Stack
1. Mobile app strategy (React Native or Flutter preferred for speed).
2. SIM dialing integration.
3. Call event collector (start/end, direction, duration).
4. Call feedback/notes and dispositions.
5. Recording ingestion service (if device provides recording file).
6. Optional cloud telephony abstraction for IVR/queue/routing.

### D. Task and Follow-up Engine
1. Task entity with due time and lead link.
2. Reminder scheduler.
3. Push notification integration.
4. Reminder UI and one-click next action.

### E. Unified Activity Timeline
1. Cross-channel timeline entity:
   - calls
   - WhatsApp
   - status changes
   - reassignments
   - notes
2. Chronological and filterable timeline on lead detail.

### F. Reporting and BI
1. Live team leaderboard (calls/talk time/sales outcomes).
2. Hourly/day/week/month/year report model.
3. Smart views and grouping dimensions.
4. Configurable report builder with async exports.
5. Chart + image + spreadsheet exports.

### G. WhatsApp Advanced Parity
1. Broadcast analytics drill-down per interaction/button.
2. Reply categorization and campaign attribution.
3. Optional strategy for personal-WhatsApp-level tracking (if legal/compliant and technically viable).

### H. Integrations and APIs
1. Connector catalog framework.
2. Customer-configurable webhooks and source keys.
3. Conversion API eventing (Meta + Google).

---

## Data Model Additions (High-Level)

Minimum new entities:
- `leads`
- `lead_fields`, `lead_field_values`
- `lead_stages`
- `lead_assignments`
- `lead_activities`
- `call_logs`
- `call_recordings`
- `followup_tasks`
- `report_configs`
- `report_jobs`
- `integration_sources`
- `ingestion_events`

Recommended relationship baseline:
- Lead is parent of activity timeline.
- Contact becomes either:
  - linked profile under lead, or
  - canonical person entity with lead state overlays.

---

## UI/UX Surfaces to Add

Core pages to reach parity:
1. `Leads` list with stage/source/assignee filters.
2. `Lead Detail` with full activity timeline and actions.
3. `Import Wizard` (upload -> map -> validate -> assign -> complete).
4. `Assignments` rules dashboard.
5. `Tasks` calendar/list + reminders.
6. `Calling Leaderboard`.
7. `BI Smart Views`.
8. `Report Builder`.
9. `Integrations Marketplace`.
10. `Mobile app` companion workflows.

---

## Suggested Execution Phasing

### Phase 1: CRM Foundation
- Leads, stages, owners, lead detail timeline skeleton.
- CSV/Excel mapping wizard v1.
- Manual assignment and bulk actions.

### Phase 2: Operations Layer
- Assignment automation (round robin + weighted).
- Follow-up tasks/reminders.
- Expanded timeline event types.

### Phase 3: Calling Layer
- Mobile calling workflow.
- Call logs + dispositions.
- Recording support where possible.

### Phase 4: Analytics + Reporting
- Leaderboards.
- Smart lead analytics.
- Configurable report builder and async exports.

### Phase 5: Integrations + CAPI
- Source connectors.
- Conversion APIs.
- Open ingestion framework hardening.

### Phase 6: Advanced WhatsApp Parity
- Deep broadcast interaction reporting.
- Agent-level workflow enhancements.

---

## Acceptance Criteria for "TeleCRM Clone Complete"

Habiv should be considered parity-ready only when all are true:
1. End user can capture leads from form/import/integration into a lead pipeline.
2. Leads can be auto-assigned by rules and weighted distribution.
3. Telecaller can call from mobile workflow, and calls are logged with outcomes.
4. Follow-up tasks/reminders are reliable across devices.
5. Lead timeline unifies calls, WhatsApp events, and status changes.
6. Manager can monitor team productivity through live leaderboard and BI views.
7. Business can configure and export activity reports without engineering help.
8. WhatsApp broadcast reports provide drill-down to actionable contact-level outcomes.

---

## Risks and Decisions Needed

1. **Personal WhatsApp tracking**  
   Need legal/compliance and technical policy before implementation.

2. **SIM calling support fragmentation**  
   Android-first likely required; iOS constraints may limit parity.

3. **Cloud telephony scope**  
   Decide build vs partner (Exotel/Knowlarity/Twilio-like vendors).

4. **Lead vs Contact canonical model**  
   Decide early to avoid migration churn.

5. **Performance and data volume**  
   Timeline and reporting tables need indexed/event-driven design from day one.

---

## Immediate Next Build Checklist (Actionable)

1. Create product spec for new `Lead` domain and lifecycle states.
2. Add database migration set for lead and activity entities.
3. Build `Leads list` + `Lead detail` pages in dashboard.
4. Build `Import wizard` MVP with column mapping and validation.
5. Add assignment rule engine MVP (manual + round robin first).
6. Add `Follow-up task` model and reminder scheduler.
7. Build reporting foundation (`report_configs`, `report_jobs`).
8. Define mobile strategy and spike call-log integration.

---

## Final Decision Summary

If the goal is full TeleCRM clone, Habiv currently has strong messaging foundations but is missing most of the **sales CRM, calling, assignment, and BI operations core** required for true parity.  
This is a platform expansion project, not just a UI polishing exercise.

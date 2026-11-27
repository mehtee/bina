import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home-redirect.tsx"),
  route("login", "routes/login.tsx"),
  layout("routes/protected-layout.tsx", [
    // Module A — Overview
    route("overview", "routes/overview.tsx"),
    route("overview/my-work", "routes/overview-my-work.tsx"),
    route("overview/activity", "routes/overview-activity.tsx"),
    // Module M — Auth / Clinic Switch / System
    route("select-clinic", "routes/select-clinic.tsx"),
    route("settings", "routes/settings.tsx"),
    route("403", "routes/forbidden.tsx"),
    route("404", "routes/not-found.tsx"),
    // Module B — Patients & Patient 360
    route("patients", "routes/patients.tsx"),
    route("patients/new", "routes/patients-new.tsx"),
    route("patients/:patientId", "routes/patient-360.tsx"),
    // Module D — Remote Monitoring
    route("monitoring", "routes/monitoring.tsx"),
    route("patients/:patientId/monitoring/*", "routes/patient-monitoring.tsx"),
    // Module C — Diagnostics AI Workbench
    route("diagnostics", "routes/diagnostics.tsx"),
    route("diagnostics/new", "routes/diagnostics-new.tsx"),
    route("diagnostics/:studyId", "routes/study-workspace.tsx"),
    // Module E — Post-Op Care Operations
    route("care", "routes/care.tsx"),
    route("care/episodes", "routes/care-episodes.tsx"),
    route("care/episodes/new", "routes/care-episodes-new.tsx"),
    route("care/print-phone", "routes/care-print-phone.tsx"),
    route("care/episodes/:episodeId", "routes/care-episode-detail.tsx"),
    // Module F — Triage & Outages
    route("triage", "routes/triage.tsx"),
    route("triage/outages", "routes/triage-outages.tsx"),
    route("triage/handoff", "routes/triage-handoff.tsx"),
    route("triage/history", "routes/triage-history.tsx"),
    // Module G — Follow-ups & Referrals
    route("follow-ups", "routes/follow-ups.tsx"),
    route("follow-ups/referrals", "routes/referrals.tsx"),
    // Module H & I — Reports & Analytics
    route("reports", "routes/reports.tsx"),
    route("analytics", "routes/analytics.tsx"),
    // Module J, K, L — Admin, Integrations, Ops Console
    route("admin", "routes/admin.tsx"),
    route("integrations", "routes/integrations.tsx"),
    route("ops", "routes/ops.tsx"),
    // Fallback
    route("*", "routes/catch-all.tsx"),
  ]),
] satisfies RouteConfig;

# Documentation Index

**Note:** This README mirrors `INDEX.md`. Both files contain the same content for convenience.

---

## What This Folder Is

This folder contains documentation for the Dottinoo web application, including:
- **Demo materials** for presentations and award submissions
- **Technical references** for developers
- **Implementation summaries** and audit reports
- **Architecture diagrams** and system overviews

---

## Documentation Catalog

| Document | Purpose | Audience | Status | Last Updated | Overlaps With |
|----------|---------|----------|--------|--------------|---------------|
| **NARRATIVE_AND_PLAYBOOK.md** | Demo narrative variants, 10-minute demo script, pre-demo checklist, trial metrics | Founder, Teacher | **Active** | 2026-01-25 | HOW_TO_DEMO.md |
| **HOW_TO_DEMO.md** | Step-by-step demo guide for teacher and student flows | Founder, Teacher | **Active** | 2026-01-25 | NARRATIVE_AND_PLAYBOOK.md |
| **PROJECT_OVERVIEW.md** | Elevator pitch, problem statement, feature inventory, MVP definition, deployment checklist | Founder, Dev | **Reference** | 2026-01-25 | PROJECT_SUMMARY_DEEP_AUDIT.md |
| **PROJECT_SUMMARY_DEEP_AUDIT.md** | Deep technical audit: routes, RBAC, security, known issues, priorities | Dev | **Reference** | 2026-01-25 | PROJECT_OVERVIEW.md |
| **MERMAID_DIAGRAMS.md** | System architecture, auth flow, teacher/student flow diagrams | Dev, Founder | **Reference** | 2026-01-25 | — |
| **REPORTS_ENHANCEMENT_SUMMARY.md** | Summary of PDF export and progress charts feature implementation | Dev | **Reference** | 2026-01-25 | REPORTS_RUNTIME_VERIFICATION.md |
| **REPORTS_RUNTIME_VERIFICATION.md** | Runtime verification checklist and fixes for reports feature | Dev | **Reference** | 2026-01-25 | REPORTS_ENHANCEMENT_SUMMARY.md |
| **SECURITY_AUDIT_SUPPORT_NEEDS.md** | Security audit for student support needs and UI preferences feature | Dev | **Reference** | 2026-01-25 | — |
| **TEACHER_STUDENT_DASHBOARD_INVESTIGATION.md** | Investigation of role-based dashboard routing and troubleshooting guide | Dev | **Reference** | 2026-01-25 | — |
| **DEMO_COMPLETION_SUMMARY.md** | Historical summary of completed demo features (templates, AI, accessibility) | Dev, Founder | **Archive-candidate** | 2026-01-25 | DEMO_IMPLEMENTATION_SUMMARY.md, FINAL_DEMO_READY_SUMMARY.md |
| **DEMO_IMPLEMENTATION_PLAN.md** | Historical implementation plan (features now complete) | Dev | **Archive-candidate** | 2026-01-25 | DEMO_IMPLEMENTATION_SUMMARY.md |
| **DEMO_IMPLEMENTATION_SUMMARY.md** | Historical implementation progress summary (features now complete) | Dev | **Archive-candidate** | 2026-01-25 | DEMO_COMPLETION_SUMMARY.md, FINAL_DEMO_READY_SUMMARY.md |
| **FINAL_DEMO_READY_SUMMARY.md** | Historical final summary declaring demo readiness | Founder | **Archive-candidate** | 2026-01-25 | DEMO_COMPLETION_SUMMARY.md |

---

## Start Here

### For Demo Day / Award Submission
1. **NARRATIVE_AND_PLAYBOOK.md** - Use narrative variants and 10-minute demo script
2. **HOW_TO_DEMO.md** - Follow step-by-step demo guide

### For New Developers
1. **PROJECT_OVERVIEW.md** - Understand the project, features, and MVP
2. **PROJECT_SUMMARY_DEEP_AUDIT.md** - Deep dive into technical architecture
3. **MERMAID_DIAGRAMS.md** - Visual system architecture

### For Feature Documentation
- **REPORTS_ENHANCEMENT_SUMMARY.md** - Reports feature (PDF export, charts)
- **SECURITY_AUDIT_SUPPORT_NEEDS.md** - Student support needs feature security
- **TEACHER_STUDENT_DASHBOARD_INVESTIGATION.md** - Dashboard routing troubleshooting

---

## Status Definitions

- **Active**: Current, actively used documentation (demo scripts, guides)
- **Reference**: Technical documentation kept for reference (architecture, audits)
- **Archive-candidate**: Historical documentation that may be archived but kept for record

---

## Overlap Notes

Several demo-related documents overlap in content:
- **DEMO_COMPLETION_SUMMARY.md**, **DEMO_IMPLEMENTATION_SUMMARY.md**, and **FINAL_DEMO_READY_SUMMARY.md** all document the same completed features. **DEMO_COMPLETION_SUMMARY.md** is the most comprehensive.
- **HOW_TO_DEMO.md** and **NARRATIVE_AND_PLAYBOOK.md** both cover demo flows; **NARRATIVE_AND_PLAYBOOK.md** includes narrative text, while **HOW_TO_DEMO.md** is more step-by-step.
- **PROJECT_OVERVIEW.md** and **PROJECT_SUMMARY_DEEP_AUDIT.md** both cover project structure; **PROJECT_OVERVIEW.md** is higher-level, **PROJECT_SUMMARY_DEEP_AUDIT.md** is deeper technical.

All documents are kept for historical reference; prefer the "Active" or "Reference" documents for current use.

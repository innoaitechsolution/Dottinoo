# Demo Implementation Plan

## Priority Order

### Phase 1: Role Separation & Distinct Experiences (CRITICAL)
1. ✅ Create `/app/teacher` and `/app/student` routes
2. ✅ Add redirect logic from `/app` based on `profile.role`
3. ✅ Enhance role badge and user info display
4. ✅ Ensure session reliability (already fixed with signOut before signIn)

### Phase 2: Teacher Demo Flow
5. ✅ Template/script task library (5-10 templates)
6. ✅ Integrate AI draft into task creation flow
7. ✅ Enhance student needs management in class management
8. ✅ Improve teacher review UX with quick feedback templates

### Phase 3: Student Accessibility
9. ✅ Student accessibility settings UI (colors, font, spacing, case)
10. ✅ Persist settings in `profiles.ui_preferences` (JSONB column)
11. ✅ Apply settings across student pages

### Phase 4: Reporting
12. ✅ Create `/app/reports` route (teacher-only)
13. ✅ Generate class and student summaries
14. ✅ CSV export functionality

### Phase 5: Polish & Cleanup
15. ✅ Redirect legacy routes to canonical ones
16. ✅ Improve empty states and demo messages
17. ✅ Visual distinction between teacher/student dashboards

---

## Implementation Details

### A) Role-Based Routes
- `/app` → redirects to `/app/teacher` or `/app/student` based on `profile.role`
- `/app/teacher` → full teacher dashboard
- `/app/student` → full student dashboard with accessibility options
- Both routes check role and redirect if wrong role accesses

### B) Template Library
- Store templates in `src/lib/templates/taskTemplates.ts` (JSON)
- Templates include: title, instructions, steps, differentiation, success criteria
- UI: Template selector in task creation → prefill form → edit → assign

### C) Student Accessibility
- Settings panel accessible from student dashboard
- Options: color theme, font size, line spacing, letter case, simplified layout
- Store in `profiles.ui_preferences` JSONB column
- Apply via CSS variables and inline styles

### D) Reporting
- Teacher-only route `/app/reports`
- Show: class selection, summary stats, per-student breakdown
- Export to CSV (simple, no external deps)

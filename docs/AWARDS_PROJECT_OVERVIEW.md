# Dottinoo - Project Overview + MVP

## PART 2 — PROJECT OVERVIEW + MVP

### 1. Elevator Pitch (UK Classroom Context)

**Dottinoo** is an inclusive education platform designed for UK classrooms, supporting learners aged 14-24. We help teachers create personalized, differentiated tasks in minutes—through manual creation, pre-built templates, or AI-assisted drafting—while giving students accessible, customizable learning experiences. Built with inclusion at its core, Dottinoo reduces teacher workload, accelerates feedback cycles, and ensures every learner can engage with content in a way that works for them.

**Dottinoo is a product by InnoAl Tech Solutions.**

### 2. Problem + Target Users

**Problem:**
- Teachers spend excessive time creating differentiated tasks for diverse learners
- Students with varying needs (SEND, accessibility, skill levels) struggle with one-size-fits-all content
- Feedback cycles are slow, reducing learning momentum
- Schools lack visibility into student progress and task completion rates

**Target Users:**
- **Primary:** Teachers and teaching assistants in UK secondary schools and colleges
- **Secondary:** Students aged 14-24 (KS4, KS5, FE)
- **Tertiary:** School administrators seeking progress visibility

### 3. What's Innovative

1. **Three-Track Task Creation:**
   - **Manual:** Full control for experienced teachers
   - **Templates:** 8 pre-built task templates (essay, research, presentation, etc.) for quick starts
   - **AI Draft:** Gemini-powered task generation that automatically considers student support needs and differentiation

2. **Built-in Accessibility:**
   - Student-customizable UI: color themes (high contrast, pastel, dyslexia-friendly), adjustable font sizes, line spacing options, letter case preferences, simplified layout modes
   - Settings persist in database and apply globally across student pages
   - Default presets based on `support_needs_tags` with student override

3. **Fast Review Workflow:**
   - Quick feedback buttons for common responses
   - AI feedback suggestions (optional) for teachers
   - One-click star awards (0-5)
   - Review queue with submission previews

4. **Reporting & Visibility:**
   - Per-class and per-student summaries
   - Task creation, assignment, submission, and review metrics
   - Stars awarded tracking
   - CSV export for school records

5. **Differentiation Built-In:**
   - Every task supports easier/standard/stretch versions
   - Assignment targeting by student needs and skill levels
   - Digital skills tracking per class

### 4. Current Working Feature Inventory

**Authentication & Roles:**
- ✅ Email/password signup and login
- ✅ Google OAuth (Apple/Microsoft: UI ready, not configured)
- ✅ Role-based routing (teacher/admin → `/app/teacher`, student/external → `/app/student`)
- ✅ Profile creation with role from signup metadata

**Teacher Features:**
- ✅ Create and manage classes
- ✅ Generate unique invite codes
- ✅ Create tasks (Manual, Template, AI modes)
- ✅ Assign tasks to whole class or selected students
- ✅ View student support needs and skill levels
- ✅ Review submissions with feedback and stars
- ✅ AI feedback suggestions (optional)
- ✅ Reports page with CSV export
- ✅ Demo seed and create-demo-users tools

**Student Features:**
- ✅ Join classes via invite code
- ✅ View assigned tasks with status
- ✅ Submit work (text + optional file upload)
- ✅ View feedback and stars
- ✅ Accessibility settings (themes, font, spacing, case, layout)
- ✅ AI help: rewrite instructions (simplify, bullet points, dyslexia-friendly)
- ✅ AI hints: next step, checklist, questions (with guardrails)

**Infrastructure:**
- ✅ Row Level Security (RLS) on all tables
- ✅ Storage bucket with RLS for submission files
- ✅ RPC functions for secure operations (`join_class_by_code`, `submit_task`, `review_task`)
- ✅ Provider abstraction for AI (Gemini/Mock)

### 5. AI Features

**Teacher AI Features:**

1. **Task Draft Generation** (`/api/ai/task-draft`):
   - Input: brief, subject, time estimate, support needs
   - Output: structured task (title, instructions, steps, differentiation, success criteria)
   - Provider: Gemini (with mock fallback)
   - Auto-populates support needs from selected students

2. **Feedback Suggestions** (`/api/ai/feedback-draft`):
   - Input: task details, student submission, optional teacher notes
   - Output: 2-3 feedback options, next step suggestion, optional stars suggestion
   - Role: teacher/admin only
   - UI: Button in review page, click to insert suggestions

**Student AI Features:**

3. **Text Rewriting** (`/api/ai/rewrite`):
   - Input: text, mode (simplify, bullet_points, dyslexia_friendly, shorten)
   - Output: rewritten text (does not overwrite original)
   - Role: student/external/teacher/admin
   - UI: Buttons in task detail page

4. **Hints Generation** (`/api/ai/hint`):
   - Input: task context, success criteria, optional student draft, request type
   - Output: hints (max 5), questions (max 3), checklist (max 5), refusal (if inappropriate request)
   - Role: student/external only
   - Guardrails:
     - Never produces full answers
     - Refuses "write it for me" requests
     - Process-oriented, aligned to success criteria
     - Input truncation (1500-2000 chars)
     - No PII in prompts

**AI Configuration:**
- Environment variables: `AI_ENABLED`, `AI_PROVIDER`, `GEMINI_API_KEY`
- Graceful degradation: If disabled or misconfigured, returns mock responses
- No breaking changes: UI remains functional without AI

### 6. Data Model Summary

**Core Tables:**

- **`profiles`**: User accounts
  - `id` (UUID, FK to `auth.users`), `role` (student, teacher, admin, external), `full_name`, `created_at`
  - `support_needs_tags` (text[]), `digital_skill_level`, `interests` (optional)
  - `ui_preferences` (JSONB) - student accessibility settings

- **`classes`**: Teacher-created classes
  - `id`, `teacher_id` (FK to profiles), `name`, `invite_code` (unique), `created_at`

- **`class_memberships`**: Student-class relationships
  - `id`, `class_id`, `student_id`, `created_at`
  - Unique constraint: (class_id, student_id)

- **`tasks`**: Task definitions
  - `id`, `class_id`, `created_by`, `title`, `instructions`
  - `steps` (JSONB array), `differentiation` (JSONB: easier/standard/stretch)
  - `success_criteria` (JSONB array)
  - `due_date`, `creation_mode` (manual/template/ai)
  - `target_skill`, `target_level` (optional, for digital skills)

- **`task_assignments`**: Task-student assignments
  - `id`, `task_id`, `student_id`
  - `status` (not_started, in_progress, submitted, reviewed)
  - `feedback`, `stars_awarded` (0-5), `reviewed_at`, `created_at`, `updated_at`

- **`submissions`**: Student work submissions
  - `id`, `task_assignment_id` (unique), `student_id`
  - `content` (text, max 5000 chars), `attachment_path` (storage path)
  - `created_at`, `updated_at`

- **`student_skill_profiles`**: Per-class digital skills tracking
  - `id`, `class_id`, `student_id`
  - Skills: `digital_safety`, `search_information`, `communication`, `productivity`, `ai_literacy`
  - Levels: `beginner`, `developing`, `confident`

**Storage:**
- Bucket: `submissions` (private)
- Path structure: `{student_id}/{task_assignment_id}/{filename}`
- RLS: Students can upload their own; teachers can read via task ownership

**RPC Functions:**
- `join_class_by_code(text)`: Student joins class via invite code
- `submit_task(uuid, text, text)`: Creates submission and updates assignment status
- `review_task(uuid, uuid, text, int)`: Updates assignment with feedback and stars

### 7. Security & Privacy Summary

**Authentication:**
- Supabase Auth with email/password and OAuth (Google)
- Session management via Supabase client (localStorage)
- Server-side auth checks in API routes via `getServerAuth()` helper

**Row Level Security (RLS):**
- All tables have RLS enabled
- Policies enforce:
  - Teachers can only see/manage their own classes and tasks
  - Students can only see their own assignments and submissions
  - Teachers can read submissions for tasks they created
  - Users can only update their own profiles (including `ui_preferences`)

**API Security:**
- `/api/ai/task-draft`: No auth (legacy; should be added)
- `/api/ai/feedback-draft`: Teacher/admin only
- `/api/ai/rewrite`: Authenticated users
- `/api/ai/hint`: Student/external only
- `/api/demo/*`: Teacher/admin only, requires `DEMO_SEED_ENABLED=true`

**AI Abuse & Cost Controls:**
- Input length limits (brief ≤1000, submission ≤2000, etc.)
- Mock fallback when AI disabled or misconfigured
- Guardrails in hint generation (no full answers, refusal on inappropriate requests)
- No PII in AI prompts

**Privacy:**
- No personal data sent to AI providers (names, emails excluded)
- Student data isolated by RLS
- Storage files accessible only to student and their teachers
- GDPR considerations: data stored in Supabase (EU/US options available)

**Demo Mode:**
- `DEMO_SEED_ENABLED` environment variable controls demo features
- Demo accounts created with predictable credentials
- Demo seed creates sample classes, tasks, and assignments for testing

### 8. Demo Script (5-7 Minutes)

**Minute 0-1: Introduction**
- "Dottinoo helps teachers create personalized tasks in minutes and gives students accessible learning experiences."
- Show landing page: "Built for UK classrooms, designed for ages 14-24."

**Minute 1-2: Teacher Creates Task (3 Ways)**
- Login as teacher → `/app/teacher`
- **Manual:** Create task → fill form → assign to class
- **Template:** Switch to Template mode → select template → pre-fills → edit → save
- **AI:** Switch to AI mode → enter brief → select students with support needs → generate → pre-fills → save

**Minute 2-3: Student Experience**
- Login as student → `/app/student`
- Join class (invite code from teacher)
- Show accessibility settings: change theme, font size, spacing → save → show visual changes
- View assigned task → show AI help buttons (simplify, hints) → submit work

**Minute 3-4: Teacher Review**
- Teacher opens task → see review queue
- Click "AI feedback suggestions" → show suggestions → click to insert
- Use quick feedback button → add stars → submit review

**Minute 4-5: Reports**
- Teacher → Reports → select class
- Show summary stats (tasks, submissions, stars)
- Show per-student breakdown
- Export CSV

**Minute 5-6: Differentiation & Skills (Optional)**
- Show task differentiation (easier/standard/stretch)
- Show student skill profiles in class management

**Minute 6-7: Q&A**

### 9. MVP Definition

**MUST-HAVE (Core MVP):**
- ✅ Role-based authentication and routing
- ✅ Teacher: create classes, create tasks (manual), assign, review, reports
- ✅ Student: join classes, view tasks, submit, view feedback
- ✅ Basic accessibility settings (themes, font size)
- ✅ File uploads for submissions
- ✅ CSV export for reports
- ✅ RLS and security policies

**NICE-TO-HAVE (Current Implementation):**
- ✅ Template library (8 templates)
- ✅ AI task draft generation
- ✅ AI feedback suggestions
- ✅ Student AI help (rewrite, hints)
- ✅ Advanced accessibility (line spacing, letter case, simplified layout)
- ✅ Digital skills tracking
- ✅ Quick feedback buttons
- ✅ Support needs tags

**OUT-OF-SCOPE (Future):**
- ❌ Real-time notifications
- ❌ Email notifications
- ❌ Mobile apps (iOS/Android)
- ❌ Offline mode
- ❌ Video/audio submissions
- ❌ Peer review
- ❌ Gamification beyond stars
- ❌ Parent portal
- ❌ Payment/subscription system
- ❌ Multi-school organization management

### 10. Risks + Mitigations

**Risk 1: AI Provider Outage or Cost Overrun**
- **Mitigation:** Mock provider fallback, input length limits, graceful degradation in UI

**Risk 2: Supabase Service Disruption**
- **Mitigation:** Supabase SLA, data export capability, local backups possible

**Risk 3: Security Breach (RLS Bypass)**
- **Mitigation:** Regular RLS policy audits, server-side auth checks in APIs, security testing

**Risk 4: User Adoption (Teachers)**
- **Mitigation:** Clear onboarding, demo accounts, template library, quick feedback workflow

**Risk 5: Accessibility Compliance**
- **Mitigation:** WCAG 2.1 AA target, student customization options, testing with assistive technologies

**Risk 6: Data Privacy (GDPR)**
- **Mitigation:** RLS policies, no PII in AI prompts, Supabase EU region option, data export/deletion capability

### 11. Deployment/Setup Checklist

**Environment Variables (Netlify):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx (for demo features)
DEMO_SEED_ENABLED=true (optional, for demo)
AI_ENABLED=true (optional)
AI_PROVIDER=gemini (or mock)
GEMINI_API_KEY=xxx (if using Gemini)
```

**Supabase Configuration:**
- [ ] Run migrations in order: 001, 002, 003, 004, 003_update, 005, 006, 007, 008, 009, 010, 012, 013, 014, 015
- [ ] Enable RLS on all tables
- [ ] Create storage bucket `submissions` with private access
- [ ] Set up RLS policies for storage
- [ ] Add redirect URLs in Auth settings:
  - `https://yourdomain.com/app`
  - `https://yourdomain.netlify.app/app` (preview)

**Demo Setup:**
- [ ] Set `DEMO_SEED_ENABLED=true`
- [ ] Create demo teacher account (or use create-demo-users API)
- [ ] Run demo seed to create sample data
- [ ] Test teacher and student login flows

**AI Setup (Optional):**
- [ ] Set `AI_ENABLED=true`
- [ ] Set `AI_PROVIDER=gemini`
- [ ] Add `GEMINI_API_KEY` (server-side only)
- [ ] Test AI endpoints (should fallback to mock if misconfigured)

**Pre-Launch Checks:**
- [ ] Test all role-based routes
- [ ] Verify RLS policies (try accessing other users' data)
- [ ] Test file uploads and downloads
- [ ] Verify CSV export
- [ ] Test accessibility settings persistence
- [ ] Verify AI fallback when disabled

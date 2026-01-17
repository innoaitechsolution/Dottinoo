# Dottinoo Web – Project Summary (Deep Audit)

## 1. High-Level Overview

### App Purpose
Education platform for ages 14–24. Teachers create classes and tasks, assign them to students, and review submissions. Students join classes via invite codes, complete tasks, submit work (text + optional file), and receive feedback and stars. The product supports differentiation (easier/standard/stretch), digital skills tracking per class, and optional AI-generated task drafts.

### Main User Roles and Intended Flows

| Role    | Stored as   | Intended flow |
|---------|-------------|---------------|
| Student | `profiles.role = 'student'` | Onboarding/signup → Login → Dashboard → Join class (invite code) → View/do tasks → Submit → See stars & feedback |
| Teacher | `profiles.role = 'teacher'` | Signup (school + teacher/TA) or Create Demo Users → Login → Dashboard → Create class → Create/assign tasks → Review submissions → Award stars |
| Admin   | `profiles.role = 'admin'`   | Signup (school + school-admin) or seed → Same as teacher + Demo Seed / Create Demo Users |
| External| `profiles.role = 'external'`| Supported in schema; no dedicated UI flows found |

---

## 2. Tech Stack + Architecture

### Framework
- **Next.js 14**, **App Router** only (no `pages/`).
- **TypeScript** throughout.
- **CSS Modules** + CSS variables (no Tailwind).

### Auth Provider: Supabase
- **Client:** `src/lib/supabase/client.ts` – lazy-init Supabase client; returns a mock when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing so the build succeeds.
- **Auth helpers:** `src/lib/supabase/auth.ts` – `signUp`, `signIn`, `signOut`, `getSession`. Login calls `signOut()` before `signIn()` to avoid stale-session issues when switching users.
- **Wiring:**
  - **No `middleware.ts`** – no server-side route protection.
  - **No auth callback route** – OAuth (e.g. Google) uses `redirectTo: ${origin}/app`. Supabase sends the user back to `/app` with hash/params; the Supabase client on `/app` recovers the session. Ensure `/app` (and your deploy origin) are in Supabase Auth → URL configuration → Redirect URLs.
  - **No React AuthProvider** – each protected page uses `supabase.auth.getSession()` / `getUser()` and `getMyProfile()` in `useEffect`, then `router.push('/login')` if unauthenticated.
- **Profile creation:** DB trigger `handle_new_user` (in `006_profile_from_auth_metadata.sql`) on `auth.users` INSERT. It sets `profiles.role` from `raw_user_meta_data->>'role'`, defaulting to `'student'`. OAuth users (e.g. Google) usually have no `role` in metadata, so they get `student` unless the profile is updated elsewhere.

### Database Schema (Supabase/Postgres)

| Table / object | Purpose |
|----------------|---------|
| `profiles`    | `id` (→ auth.users), `role`, `full_name`, `created_at`; optional `support_needs_tags`, `digital_skill_level`, `interests` (010) |
| `classes`     | `teacher_id`→profiles, `name`, `invite_code` |
| `class_memberships` | `class_id`, `student_id` |
| `tasks`       | `class_id`, `created_by`, `title`, `instructions`, `steps` (jsonb), `differentiation` (jsonb), `success_criteria` (jsonb), `due_date`, `creation_mode` (manual/template/ai), optional `target_skill`, `target_level` (013) |
| `task_assignments` | `task_id`, `student_id`, `status` (not_started, in_progress, submitted, reviewed), `feedback`, `stars_awarded`, `reviewed_at` |
| `submissions` | `task_assignment_id`, `student_id`, `content`, `attachment_url` (legacy), `attachment_path` (004) |
| `student_skill_profiles` | Per-class, per-student skills: `digital_safety`, `search_information`, `communication`, `productivity`, `ai_literacy`; levels: `beginner`, `developing`, `confident` (013) |

**RPCs:** `join_class_by_code(text)`, `submit_task(uuid, text, text)` (third arg `p_attachment_path`), `review_task(uuid, uuid, text, int)`.  
**Storage:** bucket `submissions`, private; RLS on `storage.objects` for `submissions` (user folder = `auth.uid()`; teachers can read via task/submission join).

### State Management and API Strategy
- **No global store** – React `useState`/`useEffect` in each page.
- **Data access:** `src/lib/supabase/*` – direct Supabase client (`from()`, `rpc()`, `storage`). All from the client; no Server Components for data.
- **API routes (Next.js):**
  - `POST /api/ai/task-draft` – task draft from brief/subject/time/supportNeeds; uses OpenAI when `AI_DRAFTS_ENABLED=true` and `OPENAI_API_KEY` set, else mock. **No auth or role check.**
  - `POST /api/demo/seed` – seeds demo class/tasks/assignments; requires `DEMO_SEED_ENABLED=true`, `userId` in body, and `profiles.role` in `{teacher, admin}`. **Does not verify the request is from the authenticated user with that `userId`.**
  - `POST /api/demo/create-demo-users` – creates demo teacher+student accounts; same env and role checks as seed. **Same: no check that `userId` in body is the caller.**

---

## 3. Routes & Pages Inventory

### Public

| Path | File | Renders | Data |
|------|------|---------|------|
| `/` | `src/app/page.tsx` | Redirect to `/onboarding` | — |
| `/onboarding` | `src/app/(public)/onboarding/page.tsx` | OAuth (Google; Apple/Microsoft “not configured”), Email → `/signup` | Supabase configured? |
| `/login` | `src/app/(public)/login/page.tsx` | Email/password form; on success → `/app` | `signIn`; `signOut` before `signIn` |
| `/signup` | `src/app/(public)/signup/page.tsx` | Role (student/school/parent/…), email, password; `signUp` with `{ role, full_name }`; if session → `/app`, else email confirmation message | `signUp` |
| `/terms` | `src/app/(public)/terms/page.tsx` | Static terms | — |
| `/privacy` | `src/app/(public)/privacy/page.tsx` | Static privacy | — |

There is **no** `/auth/callback`; OAuth redirects to `/app`.

### Auth Pages (conceptually)
- **Login:** `/login` (above).
- **Register:** `/signup` (above).
- **Callback:** None; OAuth lands on `/app`.

### Student Area (under `/app`, linked from dashboard)

| Path | File | Renders | Data |
|------|------|---------|------|
| `/app` | `src/app/(protected)/app/page.tsx` | Dashboard: role-based (teacher vs student). Student: next tasks, Stars, Classes, CTAs | Session, `getMyProfile`, `listStudentNextTasks`, `getStudentStats`, `listMyClasses` |
| `/app/classes` | `src/app/(protected)/app/classes/page.tsx` | Join class (invite code); list joined classes; teacher: create class, Manage Students, skill profiles | `getMyProfile`, `listMyClasses`, `createClass`, `joinClassByCode`, `getStudentsWithSkills`, `upsertSkillProfile`, etc. |
| `/app/tasks` | `src/app/(protected)/app/tasks/page.tsx` | List tasks (student: status; teacher: submitted/reviewed counts); links to `/app/tasks/[id]` | `getMyProfile`, `listTasksForStudent` / `listTasksForTeacher`, `getAssignmentStatusForTask`, `getSubmissionCountsForTask` |
| `/app/tasks/new` | `src/app/(protected)/app/tasks/new/page.tsx` | Create task: class, title, instructions, steps, differentiation, success criteria, due date, target skill/level, assign to class or selected students; optional AI draft | `getMyProfile`, `listMyClasses`, `getStudentsWithSkills`, `createTask`, `createTaskAssignments`, `/api/ai/task-draft` |
| `/app/tasks/[taskId]` | `src/app/(protected)/app/tasks/[taskId]/page.tsx` | Student: view task, submit (text + file), see feedback/stars. Teacher: list assignments/submissions, review (feedback, stars) | `getMyProfile`, task/assignment/submission APIs, `submitTask`, `reviewTask`, `uploadSubmissionFile`, `getSignedUrl` |
| `/app/stars` | `src/app/(protected)/app/stars/page.tsx` | Student: my stars. Teacher: recent reviews | `getMyProfile`, `getMyStars` / `getTeacherRecentReviews` |

### Teacher Area
Same as student for `/app`, `/app/classes`, `/app/tasks`, `/app/tasks/new`, `/app/tasks/[taskId]`, `/app/stars`. Teacher-only UI is controlled by `profile.role === 'teacher'` (or `'admin'` where applicable): Create class, Create Task, Manage Students, skill profiles, Needs Review, Demo Seed, Create Demo Users, review UI on task detail, etc.

### Admin
- No separate `/admin` route. Admins use teacher-style dashboard and the same demo tools (Demo Seed, Create Demo Users); APIs allow `role in ('teacher','admin')`.

### Legacy / Duplicate Routes (not linked from main app)
These exist under `(protected)` but **not** under `(protected)/app`. The dashboard and in-app links only point to `/app/*`. They are reachable only by direct URL and are simpler/older (e.g. no skill profiles, no BackButton, no digital skills in task list):

| Path | File | Note |
|------|------|------|
| `/classes` | `src/app/(protected)/classes/page.tsx` | Simpler classes; no skill profiles |
| `/tasks` | `src/app/(protected)/tasks/page.tsx` | Simpler task list; links to `/app/tasks/[id]` |
| `/tasks/new` | `src/app/(protected)/tasks/new/page.tsx` | Simpler create task |
| `/tasks/[taskId]` | `src/app/(protected)/tasks/[taskId]/page.tsx` | Similar to `/app/tasks/[taskId]` |
| `/stars` | `src/app/(protected)/stars/page.tsx` | Simpler stars |

---

## 4. Role-Based Access Control (RBAC)

### Where Role Is Stored
- **Source of truth:** `profiles.role` (`student` | `teacher` | `admin` | `external`).
- **Set at signup:** `signUp(..., { role, full_name })` → `raw_user_meta_data` → trigger `handle_new_user` → `INSERT` into `profiles` with `COALESCE(metadata->>'role','student')`.
- **OAuth:** `handle_new_user` runs on first `auth.users` insert; OAuth usually does not provide `role`, so default `student`.
- **Demo:** Create Demo Users and seed set `user_metadata.role` and upsert `profiles`.

### Where Role Is Checked
- **Middleware:** None.
- **Layout guards:** None; `(protected)` and `(public)` are route groups only; root `src/app/layout.tsx` has no auth logic.
- **Per-page (client):** Each protected page: `getSession()` or `getUser()`; if no session → `router.push('/login')`. Then `getMyProfile()`; role drives UI (e.g. `profile.role === 'teacher'`) and which data loads (e.g. `listTasksForTeacher` vs `listTasksForStudent`).
- **Server-side:** Demo APIs (`/api/demo/seed`, `/api/demo/create-demo-users`) check `profiles.role` for `userId` in body (teacher/admin only). They do **not** validate that the authenticated user’s token matches `userId`.
- **Database:** RLS on `profiles`, `classes`, `class_memberships`, `tasks`, `task_assignments`, `submissions`, `student_skill_profiles`, `storage.objects` – all use `auth.uid()` and/or teacher/student relations. RPCs `submit_task` and `review_task` are `SECURITY DEFINER` and use `auth.uid()`.

### Why a Teacher Might See the Student Dashboard
- **Stale session (addressed):** If a student was previously logged in and the teacher then logged in without clearing the old session, the app could still use the student’s session. `getMyProfile()` is keyed by `supabase.auth.getUser().id`, so the wrong session ⇒ wrong profile ⇒ student UI. The fix in `src/app/(public)/login/page.tsx` is to call `signOut()` before `signIn()` so each login starts from a clean session.
- **Wrong profile in DB:** If `profiles.role` for that user is `student`, the UI will show the student dashboard regardless of what the user expects. Needs DB check or support for “request teacher” type flows.
- **OAuth:** New Google (or other OAuth) users get `student` by default; no in-app flow to become teacher.

---

## 5. Core Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Login / Logout / Session** | Working | Email/password; `signOut` before `signIn` on login. Session in Supabase; `onAuthStateChange` used on `/app` and in `Header`. |
| **Session persistence** | Working | Supabase client persists session (e.g. localStorage). |
| **Signup** | Working | Email/password, role (student/school with sub-role), `signUp` with metadata; `handle_new_user` creates profile. Email confirmation behavior depends on Supabase project settings. |
| **OAuth (Google)** | Partially working | `signInWithOAuth` → redirect to `/app`. Must allow `/app` and deploy origin in Supabase. New OAuth users default to `student`. |
| **OAuth (Apple / Microsoft)** | Not implemented | UI shows “not configured”; message suggests using Email or Google. |
| **Student dashboard** | Working | `/app`: next tasks, Stars, Classes, CTAs. Data from `listStudentNextTasks`, `getStudentStats`, `listMyClasses`. |
| **Student: tasks list** | Working | `/app/tasks`; status chips; links to `/app/tasks/[id]`. |
| **Student: task detail & submit** | Working | View task; submit text + optional file (`uploadSubmissionFile` → `submissions` bucket, then `submitTask` RPC with `attachment_path`). |
| **Teacher dashboard** | Working | `/app`: Create Demo Users, Demo Seed, Needs Review, class/task CTAs, teacher stats. Role from `profiles`. |
| **Teacher: create/assign tasks** | Working | `/app/tasks/new`: create task, optional target skill/level, assign to class or selected students; optional AI draft. |
| **Teacher: view submissions & review** | Working | `/app/tasks/[taskId]`: list assignments/submissions, give feedback and stars via `reviewTask` RPC. |
| **Classes (create, join, list)** | Working | `/app/classes`: create class, join by invite code (`join_class_by_code`), list. Teacher: Manage Students, skill profiles. |
| **Digital skills (teacher)** | Working | `student_skill_profiles`; teacher sets levels per class in `/app/classes`; used in task creation (target skill/level, preselection). |
| **File uploads (submissions)** | Working | `uploadSubmissionFile` → `submissions` bucket; `attachment_path` in `submissions`; `getSignedUrl` for download. Storage RLS in place. |
| **AI task drafts** | Partially working | `/api/ai/task-draft`: mock when `AI_DRAFTS_ENABLED`/`OPENAI_API_KEY` not set; OpenAI when set. **No auth:** anyone can POST. |
| **Demo Seed** | Working | `DEMO_SEED_ENABLED` + teacher/admin `userId` in body; API checks `profiles.role`. **Does not verify** that `userId` is the authenticated user. |
| **Create Demo Users** | Working | Same as Demo Seed for env and role. **Same:** `userId` in body is not checked against the session. |
| **Notifications / emails** | None | No Resend, SendGrid, or similar. |
| **Payments** | None | — |

---

## 6. Configuration & Deployment

### Required Env Vars
- `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – anon key.

### Optional
- `SUPABASE_SERVICE_ROLE_KEY` – for demo seed and create-demo-users (admin client).
- `DEMO_SEED_ENABLED` – `"true"` to enable `/api/demo/seed` and create-demo-users.
- `AI_DRAFTS_ENABLED` – `"true"` to allow AI drafts; `"false"` → 403 from `/api/ai/task-draft`.
- `OPENAI_API_KEY` – used when `AI_DRAFTS_ENABLED=true`; if missing, mock draft.

### Hardcoded / Deployment
- OAuth `redirectTo`: `window.location.origin + '/app'` in `src/app/(public)/onboarding/page.tsx`. For production, origin must match the deploy URL.
- No `netlify.toml` in the repo. README describes Netlify: connect repo, set env vars, Node 18+.
- README: build can succeed without env vars (lazy Supabase init); public routes can be static. Runtime will need Supabase vars for real auth and data.

### Build / Deploy Pitfalls
- **.env.example:** If it contains real Supabase URLs/keys (instead of placeholders), treat as a critical leak; replace with placeholders and rotate any exposed keys.
- **Supabase redirect URLs:** Add the production (and preview) base URL + `/app` in Supabase Auth → URL configuration.
- **Migration order:** Run SQL in order: 001, 002, 003, 004, 003_update (after 004 so `attachment_path` exists), 005, 006, 007, 008, 009, 010, 012, 013. `submit_task` is redefined in 003_update and 005 to use `p_attachment_path`.

---

## 7. Known Issues & TODOs

### Security
- **`/api/ai/task-draft`:** No auth. Any client can POST; if `OPENAI_API_KEY` is set, this can incur cost and abuse.
- **`/api/demo/seed` and `/api/demo/create-demo-users`:** They validate `profiles.role` for `userId` in the body but do **not** ensure the request comes from the authenticated user with that `userId`. A user who knows a teacher’s `userId` could trigger seed or create-demo-users as that teacher.
- **`.env.example`:** Should only have placeholders. If it contains real keys/URLs, remove and rotate.

### Structure and Dead Code
- **Duplicate/legacy routes:** `/classes`, `/tasks`, `/tasks/new`, `/tasks/[taskId]`, `/stars` under `(protected)` are not linked from the app. Consider removing or redirecting to `/app/*` to avoid two parallel UIs.
- **No `middleware.ts`:** All protection is client-side. A determined user can load a protected route and see a brief flash or loading state before redirect; middleware would fail faster. Not a functional bug, but a hardening opportunity.

### Incomplete / Not Wired
- **Apple and Microsoft OAuth:** Buttons exist; handlers return “not configured.”
- **`external` role:** In schema and types; no specific UI.
- **Profile fields** `support_needs_tags`, `digital_skill_level`, `interests`: in DB (010) and used by seed; no dedicated profile/settings UI for students to edit them.

### TODOs / FIXMEs
- Grep for `TODO|FIXME|HACK|XXX` in `src` did not return results; no explicit TODOs found in code.

### RLS and Policies
- RLS is enabled on core tables and storage; policies follow teacher/student and ownership. `007_rls_fixes.sql`, `008_fix_rls_recursion.sql`, `009_join_assignments_fix.sql` indicate past RLS fixes; ensure all are applied in the right order.

---

## 8. Top 5 Priorities to Fix Next

1. **Harden API auth (high impact, security)**  
   - **`/api/ai/task-draft`:** Require an authenticated user and, if only teachers should use it, `profiles.role in ('teacher','admin')` (e.g. via a shared helper that reads `Authorization`/cookie and Supabase `getUser`/profile).  
   - **`/api/demo/seed` and `/api/demo/create-demo-users`:** Verify the JWT/session, get `auth.uid()`, and ensure `userId` in the body equals `auth.uid()` (or that the caller is at least an admin).  

2. **Clean up `.env.example` and OAuth config**  
   - Replace any real values in `.env.example` with placeholders; rotate keys if they were ever committed.  
   - Document that Supabase Auth redirect URLs must include the production (and preview) `/app` URL.  

3. **Resolve or remove duplicate routes**  
   - Prefer one set of canonical routes (`/app/*`). For `/classes`, `/tasks`, `/tasks/new`, `/tasks/[taskId]`, `/stars`: either 301 to `/app/...` or delete and rely on `/app/*`.  

4. **Optional: middleware for protected routes**  
   - Add `middleware.ts` to check Supabase session (e.g. via `getToken` or similar) for `/app` and `/app/*` (and any other protected path) and redirect to `/login` before the page renders. Keeps client checks but reduces exposure.  

5. **OAuth role and “external”**  
   - Decide how OAuth-only users (e.g. Google) can become teachers (e.g. “request access” or admin-set role).  
   - If `external` is used, add minimal UI or document intended use so it doesn’t fall back to generic student behavior by default.  

---

**Document generated from repository review.**  
For the teacher-login → student-dashboard fix, see `docs/TEACHER_LOGIN_FIX_SUMMARY.md`.

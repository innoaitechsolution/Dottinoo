# Dottinoo Web App

A Next.js education platform for ages 14-24, built with TypeScript and Supabase authentication.

## Features

- 🎨 **Brand-focused design** with custom CSS variables and design tokens
- 🔐 **Supabase authentication** with email/password and OAuth (Google)
- 🛡️ **Protected routes** with session-based access control
- 📱 **Responsive layout** with clean, modern UI
- 🎯 **Type-safe** with TypeScript throughout
- 👥 **Role-based access** (teacher/admin, student)
- 📚 **Class management** with invite codes
- ✅ **Task creation and assignment** (manual, templates, AI-assisted)
- 📝 **Student submissions** with file attachments
- ⭐ **Review and feedback** with star awards
- 📊 **Reports and analytics** with CSV export
- ♿ **Accessibility features** (UI preferences, support needs)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules + CSS Variables (no Tailwind)
- **Authentication**: Supabase Auth (email/password, OAuth)
- **Database**: Supabase Postgres (with Row Level Security)
- **Storage**: Supabase Storage (for file attachments)
- **Package Manager**: npm

## Prerequisites

- Node.js 20+ and npm (see [Node version](#node-version) below)
- A Supabase project (free tier works)

## Node version

This project requires **Node.js 20 or higher**. Node.js 18 and below are deprecated and will no longer be supported in future versions of `@supabase/supabase-js`.

If you're using `nvm` (Node Version Manager), you can automatically use the correct version:

```bash
nvm use
```

This will read the `.nvmrc` file in the project root and switch to Node 20.

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your Project URL and anon/public key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - Server-only (for demo features)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional - Feature flags
DEMO_SEED_ENABLED=true
AI_DRAFTS_ENABLED=true

# Optional - AI features (if AI_DRAFTS_ENABLED=true)
OPENAI_API_KEY=your_openai_api_key

# Optional - SEO metadata (defaults to https://dottinoo.co.uk)
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

**Environment Variable Reference:**

| Variable | Description | Required | Notes |
|----------|-------------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes | Public, safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes | Public, safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No | Server-only, for demo seed features |
| `DEMO_SEED_ENABLED` | Enable demo seed utilities | No | Set to `"true"` to enable |
| `AI_DRAFTS_ENABLED` | Enable AI task draft generation | No | Set to `"true"` to enable |
| `OPENAI_API_KEY` | OpenAI API key for AI features | No | Required if `AI_DRAFTS_ENABLED=true` |
| `NEXT_PUBLIC_SITE_URL` | Site URL for metadata/OG tags | No | Defaults to `https://dottinoo.co.uk` |

**Important Security Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the client (safe for anon key)
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and should NEVER be exposed to the client
- Do NOT commit `.env.local` to your repository

### 4. Set Up Supabase Database

Run the SQL migrations in order. All migration files are in `supabase/sql/`:

1. **001_profiles.sql** - Creates profiles table with RLS policies
2. **002_core_classes_tasks.sql** - Creates classes, class_memberships, tasks, and task_assignments tables
3. **003_task_flow_submissions_ai.sql** - Creates submissions table and RPC functions (submit_task, review_task)
4. **003_task_flow_submissions_ai_update.sql** - Updates submit_task RPC to use attachment_path
5. **004_storage_attachments.sql** - Sets up storage bucket for file attachments
6. **005_indexes_and_validation.sql** - Adds indexes and validation constraints
7. **006_profile_from_auth_metadata.sql** - Auto-creates profiles from auth metadata
8. **007_rls_fixes.sql** - Fixes RLS policies for classes (critical for teacher access)
9. **008_fix_rls_recursion.sql** - Fixes RLS recursion errors
10. **009_join_assignments_fix.sql** - Ensures students see tasks when joining class
11. **010_student_profile_tags.sql** - Adds student personalization fields
12. **012_rpc_list_student_tasks.sql** - Creates RPC function for student task listing
13. **013_digital_skills_profiles.sql** - Adds digital skills tracking per class
14. **014_ui_preferences.sql** - Adds UI preferences column to profiles
15. **015_ui_preferences_rls.sql** - Ensures RLS allows UI preferences updates
16. **016_student_support_needs.sql** - Creates student_support_needs and student_ui_prefs tables
17. **017_tasks_target_skill_columns.sql** - Adds target_skill and target_level columns to tasks (safe/idempotent; also refreshes PostgREST schema cache)

**To run migrations:**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open each migration file from `supabase/sql/` in order
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute

**Important Notes:**
- Run migrations in numerical order (001, 002, 003, etc.)
- After running `004_storage_attachments.sql`, if bucket creation fails, create it manually:
  - Go to Supabase Dashboard → **Storage**
  - Click **Create Bucket**
  - Name: `submissions`
  - Public: **false** (keep it private)
- After running `006_profile_from_auth_metadata.sql`, ensure email confirmation is enabled in Supabase Auth settings
- If you see "Failed to load classes" errors, ensure `007_rls_fixes.sql` and `008_fix_rls_recursion.sql` are run

### 5. Supabase Auth → URL Configuration (required for email confirmation and OAuth)

Configure URLs so email confirmation and OAuth redirects land on the correct site (production vs local).

**Checklist (do in Supabase Dashboard):**

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**:
   - **Production:** `https://dottinoo.co.uk`
   - For local dev, you can leave this as production; the app sends the current origin for redirects.
3. Add **Redirect URLs** (one per line):
   - `https://dottinoo.co.uk/auth/callback`
   - `https://dottinoo.co.uk/**`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/**`
4. **Email templates:** Ensure confirmation emails use the Site URL / redirect correctly (default templates use Site URL; no change needed if Site URL is set as above).

**Why this matters:** If Site URL is wrong, "Confirm your email" links can send users to localhost in production. The app uses `emailRedirectTo` and `redirectTo` based on the current origin so production users land on `https://dottinoo.co.uk` and local users on `http://localhost:3000`.

**Verification:** After configuring, confirm: (1) Local: email confirmation link returns the user to `http://localhost:3000/app`. (2) Production: email confirmation link returns the user to `https://dottinoo.co.uk/app`. (3) Google OAuth still completes and lands on `/app`.

### 6. Set Up OAuth (Google)

To enable Google OAuth sign-in:

1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials (Client ID and Client Secret)
4. Add redirect URLs in Supabase (if not already added in step 5):
   - `http://localhost:3000/auth/callback` (for local development)
   - `https://dottinoo.co.uk/auth/callback` (for production)
   - `https://your-preview-url.netlify.app/auth/callback` (for Netlify previews)

**Callback URL Format:**
- Supabase redirects to `{your-site-url}/auth/callback?next=/app`; the app exchanges the code and sends the user to `/app`.
- Ensure these URLs are in Supabase **Redirect URLs** and in your OAuth provider settings.

**Note:** Apple and Microsoft OAuth are UI-ready but not configured. The UI will show a message directing users to use Email or Google.

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public routes
│   │   ├── login/         # Sign in page
│   │   ├── signup/        # Sign up page
│   │   ├── onboarding/    # OAuth provider selection
│   │   ├── about/         # About page
│   │   ├── privacy/       # Privacy notice
│   │   └── terms/         # Terms of service
│   ├── (protected)/      # Protected routes
│   │   └── app/           # Main app (requires auth)
│   │       ├── classes/   # Class management
│   │       ├── tasks/     # Task list and creation
│   │       ├── tasks/[taskId]/  # Task detail and review
│   │       ├── reports/   # Reports and analytics
│   │       ├── stars/     # Stars page (students)
│   │       ├── teacher/   # Teacher dashboard
│   │       └── student/   # Student dashboard
│   ├── api/               # API routes
│   │   ├── ai/            # AI endpoints (task-draft, feedback-draft, hint, rewrite)
│   │   └── demo/          # Demo utilities (seed, create-demo-users)
│   ├── layout.tsx         # Root layout with metadata
│   └── globals.css        # Global styles & CSS variables
├── components/
│   ├── Header.tsx         # App header with logo
│   ├── Button.tsx         # Reusable button component
│   ├── Input.tsx          # Reusable input component
│   └── navigation/        # Navigation components
├── lib/
│   ├── supabase/          # Supabase helpers
│   │   ├── client.ts      # Supabase client instance
│   │   ├── auth.ts        # Auth helper functions
│   │   ├── classes.ts     # Class operations
│   │   ├── tasks.ts       # Task operations
│   │   ├── submissions.ts # Submission operations
│   │   └── ...            # Other Supabase helpers
│   ├── ai/                # AI provider abstraction
│   └── templates/         # Task templates
└── theme/
    └── tokens.ts          # Design tokens (TypeScript)
```

## Brand Colors

The app uses the following brand palette defined as CSS variables:

- **Primary Blue**: `#4196E2`
- **Deep Navy**: `#133E6C`
- **Background Blue 50**: `#ECF4FC`
- **Background Blue 100**: `#D9EAF9`
- **Light Sky**: `#93CEEE`
- **Aqua**: `#90E9D5`
- **Reward Yellow**: `#F5D86F`
- **Energy Orange**: `#B4511D`
- **Soft Text**: `#355A7F`
- **White**: `#FFFFFF`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Pilot Flow

The core user flow for the pilot:

1. **Teacher creates class** → Receives invite code
2. **Student joins class** → Uses invite code on `/app/classes`
3. **Teacher creates task** → Manual, Template, or AI-assisted
4. **Task assigned** → Automatically to class or selected students
5. **Student views task** → On `/app/tasks` with status chips
6. **Student submits** → Text content + optional file attachment
7. **Teacher reviews** → Provides feedback and awards stars (0-5)
8. **Student sees review** → On task detail page and `/app/stars` page

**Additional Features:**
- Teachers can set student support needs and UI preferences (teacher-only)
- Students can customize UI preferences (font size, spacing, contrast)
- Teachers can track digital skills per class
- Tasks can be targeted to specific skills/levels
- Reports page with CSV export for teachers

## Demo Tooling

### Demo Seed (`/api/demo/seed`)

**What it does:**
- Creates a demo class with invite code
- Creates 3 demo students with diverse profiles (support needs, skill levels, UI preferences)
- Creates 2-3 sample tasks with assignments
- Creates 1 sample submission

**Who can run it:**
- Teachers and admins only (requires `DEMO_SEED_ENABLED=true`)
- Requires `SUPABASE_SERVICE_ROLE_KEY` (server-only)

**How to use:**
1. Login as teacher/admin
2. Go to `/app/teacher` dashboard
3. Click "Demo Seed" button
4. Copy the returned credentials (class invite code, student emails/passwords)

### Create Demo Users (`/api/demo/create-demo-users`)

**What it does:**
- Creates a demo teacher account
- Creates a demo student account
- Both accounts are pre-confirmed and ready to use

**Who can run it:**
- Teachers and admins only (requires `DEMO_SEED_ENABLED=true`)
- Requires `SUPABASE_SERVICE_ROLE_KEY` (server-only)

**How to use:**
1. Login as teacher/admin
2. Go to `/app/teacher` dashboard
3. Click "Create Demo Users" button
4. Copy the returned credentials (emails and password)

**Default Password:** `DottinooDemo123!` (for all demo accounts)

**Security Note:** These endpoints check the user's role but do not verify that the `userId` in the request body matches the authenticated session. This is acceptable for demo/pilot use but should be hardened for production.

## Authentication Flow

1. **Sign Up**: Users can create an account at `/signup` (email/password) or `/onboarding` (OAuth)
2. **Sign In**: Existing users sign in at `/login` (email/password) or `/onboarding` (OAuth)
3. **Protected Routes**: `/app` and all `/app/*` routes require authentication and redirect to `/login` if not signed in
4. **Role-based Routing**: 
   - Teachers/admins → `/app/teacher` dashboard
   - Students → `/app/student` dashboard
5. **Sign Out**: Users can sign out from the header navigation

## Deploying to Netlify

### Prerequisites

1. A Netlify account
2. Your Supabase project set up (see Setup Instructions above)
3. A GitHub/GitLab repository with your code

### Deployment Steps

1. **Connect Repository to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Netlify will auto-detect Next.js settings

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next` (Next.js will handle this automatically)
   - Node version: 20 or higher (set in Netlify UI or `netlify.toml`)

3. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add the following variables:

   **Required:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   **Optional (for demo/development features):**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   AI_DRAFTS_ENABLED=true
   DEMO_SEED_ENABLED=true
   ```

   **Optional (for SEO metadata):**
   ```
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```

   **Important:**
   - Do NOT commit `.env.local` to your repository
   - Environment variables in Netlify are set per-site, not per-deployment
   - `NEXT_PUBLIC_*` variables are exposed to the client (safe for anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` is server-only and should never be exposed to the client
   - Set `NEXT_PUBLIC_SITE_URL` to your Netlify domain for proper OG image URLs

4. **Configure OAuth Redirect URLs**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add your Netlify domain: `https://your-site.netlify.app/app`
   - Add preview URLs if using Netlify branch previews: `https://deploy-preview-*.netlify.app/app`

5. **Deploy**
   - Netlify will automatically deploy on every push to your main branch
   - Or trigger a manual deploy from the Deploys tab

### Build Safety

The app is configured to build successfully on Netlify even if environment variables are missing:
- Supabase client uses lazy initialization (checks env vars at runtime, not build time)
- Public pages (/, /about, /login, /signup, /terms, /privacy, /onboarding) can be statically generated
- Protected pages are client-side rendered and require env vars only at runtime

**Note:** While the build will succeed without env vars, the app will not function correctly at runtime without the required Supabase variables. Always set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Netlify.

### Troubleshooting

- **Build fails with "Missing Supabase environment variables"**: This should not happen with the current setup. If it does, check that you're using the latest version of `src/lib/supabase/client.ts`
- **App works locally but not on Netlify**: Verify environment variables are set correctly in Netlify (check Site settings → Environment variables)
- **Static pages fail to generate**: Public pages should generate successfully. If they don't, check the build logs for specific errors
- **OAuth redirect fails**: Ensure redirect URLs are added in both Supabase and your OAuth provider settings
- **OG images not showing**: Ensure `NEXT_PUBLIC_SITE_URL` is set to your Netlify domain and `public/og/og-image.png` exists

### Windows Build Fails (`EPERM .next/trace`)

If `npm run build` fails with `Error: EPERM: operation not permitted, open '...\.next\trace'`:

1. **Stop the dev server** (`Ctrl+C` in the terminal running `next dev`).
2. **Kill lingering Node processes** (PowerShell, run as Administrator if needed):
   ```powershell
   taskkill /F /IM node.exe
   ```
3. **Remove the `.next` folder** (the `clean` script does this for you):
   ```bash
   npm run clean
   ```
   Or manually:
   ```powershell
   Remove-Item -Recurse -Force .next
   ```
4. **Run the build again**:
   ```bash
   npm run build
   ```

The `prebuild` script in `package.json` now runs `rimraf .next` automatically before every build, which prevents stale lock files from blocking the build.

**Common causes:** VSCode file watcher, Windows Defender / Controlled Folder Access, OneDrive sync. If the error keeps returning, exclude the project folder from OneDrive sync and add it to Defender's exclusion list.

### Production CORS / Auth Issues

If login fails with `"Failed to fetch"` or CORS errors in the browser console:

1. **Verify environment variables in your host (Netlify/Vercel):**
   - `NEXT_PUBLIC_SUPABASE_URL` must be the full URL (e.g. `https://<project-ref>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be the **anon/public** key (NOT the service role key)

2. **Supabase Dashboard → Project Settings → API → CORS Allowed Origins** — add:
   - `https://dottinoo.co.uk`
   - `https://www.dottinoo.co.uk`
   - `http://localhost:3000`
   - Any Netlify preview domains (e.g. `https://*.netlify.app`)

3. **Supabase Dashboard → Authentication → URL Configuration:**
   - Site URL: `https://dottinoo.co.uk`
   - Redirect URLs: `https://dottinoo.co.uk/**`, `http://localhost:3000/**`

### Schema Cache / 400 Errors on Tasks

If you see `"Could not find the 'target_level' column of 'tasks' in the schema cache"`:

1. Run migration **017_tasks_target_skill_columns.sql** in the Supabase SQL Editor
2. The migration includes `SELECT pg_notify('pgrst', 'reload schema')` to auto-refresh PostgREST
3. If the error persists, run manually in SQL Editor: `SELECT pg_notify('pgrst', 'reload schema');`

## QA Checklist

Before deploying or testing the full flow, verify these scenarios:

### Teacher Flow
- [ ] **Create Class**: Teacher can create a new class and receive an invite code
- [ ] **Create Task**: Teacher can create a task using:
  - [ ] Manual entry
  - [ ] Template selection (auto-fills form)
  - [ ] AI Assist (generates draft if enabled, or shows mock if not)
- [ ] **View Tasks**: Teacher sees task list with submission counts (submitted/reviewed)
- [ ] **Review Submission**: Teacher can:
  - [ ] Download student attachment (signed URL)
  - [ ] Provide feedback
  - [ ] Award stars (0-5)
  - [ ] Mark as reviewed
- [ ] **View Reports**: Teacher can view class stats and export CSV
- [ ] **Manage Students**: Teacher can set support needs, UI preferences, and skill profiles

### Student Flow
- [ ] **Join Class**: Student can join a class using invite code
- [ ] **View Tasks**: Student sees assigned tasks with status chips (Not Started/In Progress/Submitted/Reviewed)
- [ ] **Submit Task**: Student can:
  - [ ] Write response content
  - [ ] Upload file attachment
  - [ ] Submit task
- [ ] **View Stars**: Student can see:
  - [ ] Total stars earned on dashboard
  - [ ] Recent stars with task titles and feedback on /app/stars page
- [ ] **UI Preferences**: Student can customize font size, spacing, contrast, etc.

### End-to-End Test
1. Teacher creates a class → Note the invite code
2. Student joins the class using the invite code
3. Teacher creates a task (try all three modes: manual, template, AI)
4. Student views the task and submits with a file attachment
5. Teacher downloads the attachment and reviews it with feedback and stars
6. Student sees the review and stars on the task detail page and stars page

## License

Private - Dottinoo Education Platform

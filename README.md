# Dottinoo Web App

A Next.js education platform for ages 14-24, built with TypeScript and Supabase authentication.

## Features

- 🎨 **Brand-focused design** with custom CSS variables and design tokens
- 🔐 **Supabase authentication** with email/password sign up and sign in
- 🛡️ **Protected routes** with session-based access control
- 📱 **Responsive layout** with clean, modern UI
- 🎯 **Type-safe** with TypeScript throughout

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules + CSS Variables (no Tailwind)
- **Authentication**: Supabase
- **Package Manager**: npm

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier works)

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

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Set Up Supabase Database

Before testing signup, you need to create the profiles table in your Supabase database:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/001_profiles.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will create the `profiles` table with Row Level Security (RLS) policies that allow users to manage their own profiles.

### 5. Set Up Core Database Tables

After setting up profiles, create the core tables for classes, tasks, and assignments:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/002_core_classes_tasks.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will create the `classes`, `class_memberships`, `tasks`, and `task_assignments` tables with RLS policies and a function for joining classes by invite code.

### 6. Set Up Task Flow Tables

After setting up core tables, create the submissions table and RPC functions for task submission and review:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/003_task_flow_submissions_ai.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will create the `submissions` table with RLS policies and RPC functions for `submit_task` and `review_task`.

### 7. Set Up Storage for File Attachments

Set up Supabase Storage for file uploads in task submissions:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/004_storage_attachments.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

**Important:** If the bucket creation fails due to permissions, create it manually:
1. Go to Supabase Dashboard > **Storage**
2. Click **Create Bucket**
3. Name: `submissions`
4. Public: **false** (unchecked - keep it private)
5. Click **Create bucket**

This will:
- Create the `submissions` storage bucket (private)
- Add `attachment_path` column to the submissions table
- Set up RLS policies for secure file access

**Folder convention:** Files are stored as `submissions/<userId>/<assignmentId>/<filename>`

**Note:** After running the storage SQL, you may also need to update the `submit_task` RPC function. If you've already run `003_task_flow_submissions_ai.sql`, run `supabase/sql/003_task_flow_submissions_ai_update.sql` to update the function to use `attachment_path` instead of `attachment_url`.

### 8. Add Database Indexes and Validation

Add performance indexes and data validation constraints:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/005_indexes_and_validation.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will:
- Add CHECK constraints for data length validation (submissions content, task titles/instructions)
- Create indexes on frequently queried columns for better performance
- Update the `submit_task` RPC to validate content length and reject empty submissions

### 9. Set Up Automatic Profile Creation

Set up automatic profile creation from auth metadata:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/006_profile_from_auth_metadata.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will create a database trigger that automatically creates a profile when a user signs up, using the role and full_name from the signup metadata. This ensures profiles are created server-side, not from the client.

**Important:** Make sure email confirmation is enabled in your Supabase project settings (Authentication > Email Templates > Confirm signup). The profile will be created when the user confirms their email.

### 10. Fix RLS Policies for Classes

Fix Row Level Security policies to ensure teachers can view their classes:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/007_rls_fixes.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will:
- Replace the "FOR ALL" policy with explicit SELECT, INSERT, UPDATE, DELETE policies for teachers
- Ensure teachers can SELECT their own classes (fixes "Failed to load classes" issue)
- Ensure teachers can SELECT class memberships for their classes
- Keep all existing student policies intact

**Important:** This migration fixes a critical issue where teachers cannot view classes after creating them (via demo seed or manually). Run this migration if you experience "Failed to load classes" errors.

### 11. Fix RLS Recursion Error

Fix the "infinite recursion detected in policy" error that may occur after running step 10:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/008_fix_rls_recursion.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will:
- Create SECURITY DEFINER helper functions to break circular RLS dependencies
- Replace recursive policies with non-recursive versions using helper functions
- Ensure teachers can SELECT their own classes (no recursion)
- Ensure students can SELECT classes they are members of (no recursion)
- Ensure teachers can SELECT memberships for their classes (no recursion)
- Maintain all existing permissions and least-privilege access

**Important:** If you see "infinite recursion detected in policy for relation 'classes'" after running step 10, run this migration immediately. The helper functions use SECURITY DEFINER to bypass RLS when checking cross-table relationships, breaking the recursion cycle.

### 12. Fix Task Assignments on Class Join

Ensure students who join a class after tasks exist immediately see those tasks:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/009_join_assignments_fix.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will:
- Update `join_class_by_code` RPC to create task assignments for ALL existing tasks when a student joins
- Use efficient INSERT...SELECT instead of a loop
- Add validation to ensure only students can join classes
- Return both class_id and class_name for UI confirmation

**Important:** This fixes the issue where students who join a class via invite code after tasks already exist don't see those tasks. After this migration, joining a class will automatically create task assignments for all existing tasks in that class, making tasks visible immediately on `/app/tasks`.

### 13. Add Student Profile Tags for Personalization

Add optional fields to profiles for student personalization (without sensitive medical data):

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/010_student_profile_tags.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will:
- Add `support_needs_tags` (text array) for support need tags
- Add `digital_skill_level` (text: 'starter', 'intermediate', 'advanced')
- Add `interests` (text array, optional) for student interests
- Enable teacher personalization when assigning tasks
- Support demo seed with diverse student profiles

**Important:** These fields are optional and intended for educational personalization only. They do NOT contain sensitive medical information.

### 14. Fix Student Task Listing (RPC)

Fix the student task listing bug where tasks fail to load due to RLS recursion:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/012_rpc_list_student_tasks.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will:
- Create a SECURITY DEFINER RPC function `list_student_tasks()` that returns assigned tasks
- Avoid RLS recursion issues by using a single query with JOINs
- Ensure students can only see their own assigned tasks (enforced by WHERE clause)
- Return all fields needed by the UI (status, stars_awarded, class info, etc.)

**Important:** This fixes the issue where students see "Failed to load tasks" even though task assignments exist. The RPC function bypasses RLS for the query but maintains security by filtering on `student_id = auth.uid()`.

### 15. Add Digital Skills Profiles (Personalization)

Enable teachers to set digital skills profiles for students and target tasks to specific skills:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/sql/013_digital_skills_profiles.sql` from this repository
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute the SQL

This will:
- Create `student_skill_profiles` table for tracking student digital skills per class
- Add `target_skill` and `target_level` columns to `tasks` table
- Set up RLS policies so teachers can manage profiles for their classes
- Allow students to view their own profiles

**Digital Skills:**
- `digital_safety`: Online safety, privacy, security
- `search_information`: Finding and evaluating information online
- `communication`: Email, messaging, professional communication
- `productivity`: File organization, tools, time management
- `ai_literacy`: Understanding and using AI tools responsibly

**Levels:**
- `beginner`: Just starting to learn
- `developing`: Making progress, needs support
- `confident`: Comfortable and independent

**Features:**
- Teachers can set skill profiles for each student in each class (via "Manage Students" on `/app/classes`)
- Teachers can optionally target tasks to specific skills/levels when creating tasks
- **Smart Suggestions**: When creating a task with target skill/level and choosing "Selected students", matching students are automatically preselected (teacher can modify)
- **Student Skill Badges**: When selecting students, teachers see each student's skill levels as small badges
- Students see skill labels on task cards when tasks are targeted
- Tasks can be assigned to whole class or selected students
- Indexes added for performance on `(class_id, target_skill)` and `(target_skill, target_level)`

**Important:** This is for educational personalization only. Skills are tracked per class because a student's skill level may vary by context or class subject.

### 16. Add Logo (Optional)

Place your Dottinoo logo at:
```
public/brand/dottinoo-logo.png
```

If the logo is missing, a placeholder with "D" will be displayed.

### 17. Run the Development Server

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
│   │   └── signup/        # Sign up page
│   ├── (protected)/       # Protected routes
│   │   └── app/           # Main app page (requires auth)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles & CSS variables
├── components/
│   ├── Header.tsx         # App header with logo
│   ├── Button.tsx         # Reusable button component
│   └── Input.tsx          # Reusable input component
├── lib/
│   └── supabase/
│       ├── client.ts      # Supabase client instance
│       └── auth.ts        # Auth helper functions
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

## Authentication Flow

1. **Sign Up**: Users can create an account at `/signup`
2. **Sign In**: Existing users sign in at `/login`
3. **Protected Route**: `/app` requires authentication and redirects to `/login` if not signed in
4. **Sign Out**: Users can sign out from the `/app` page

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for server-side operations) | Optional (for demo seed) |
| `OPENAI_API_KEY` | OpenAI API key for AI task drafts | Optional |
| `AI_DRAFTS_ENABLED` | Set to `"true"` to enable AI task draft generation | Optional |
| `DEMO_SEED_ENABLED` | Set to `"true"` to enable demo seed utilities | Optional |

**Note:** The app uses lazy initialization for Supabase client, so the build will succeed even if environment variables are missing. However, the app will require these variables at runtime.

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
   - Node version: 18 or higher (set in Netlify UI or `netlify.toml`)

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

   **Important:**
   - Do NOT commit `.env.local` to your repository
   - Environment variables in Netlify are set per-site, not per-deployment
   - `NEXT_PUBLIC_*` variables are exposed to the client (safe for anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` is server-only and should never be exposed to the client

4. **Deploy**
   - Netlify will automatically deploy on every push to your main branch
   - Or trigger a manual deploy from the Deploys tab

### Build Safety

The app is configured to build successfully on Netlify even if environment variables are missing:
- Supabase client uses lazy initialization (checks env vars at runtime, not build time)
- Public pages (/, /login, /signup, /terms, /privacy, /onboarding) can be statically generated
- Protected pages are client-side rendered and require env vars only at runtime

**Note:** While the build will succeed without env vars, the app will not function correctly at runtime without the required Supabase variables. Always set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Netlify.

### Troubleshooting

- **Build fails with "Missing Supabase environment variables"**: This should not happen with the current setup. If it does, check that you're using the latest version of `src/lib/supabase/client.ts`
- **App works locally but not on Netlify**: Verify environment variables are set correctly in Netlify (check Site settings → Environment variables)
- **Static pages fail to generate**: Public pages should generate successfully. If they don't, check the build logs for specific errors

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

### End-to-End Test
1. Teacher creates a class → Note the invite code
2. Student joins the class using the invite code
3. Teacher creates a task (try all three modes: manual, template, AI)
4. Student views the task and submits with a file attachment
5. Teacher downloads the attachment and reviews it with feedback and stars
6. Student sees the review and stars on the task detail page and stars page

## License

Private - Dottinoo Education Platform


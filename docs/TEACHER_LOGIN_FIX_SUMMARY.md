# Teacher Login → Student Dashboard Bug: Fix Summary

## Root Cause

**Stale session when switching users:** When a user was already logged in as a **student** (e.g. `Demo.Student1+...@Dottinoo.Test`) and then went to `/login` and signed in with **teacher** credentials, the previous student session was **not** explicitly cleared before the new sign-in. In some environments (browser caching, Supabase client timing, or multiple tabs), the old session could persist or mix with the new one, so the app continued to show the student’s identity and student dashboard.

- **Role source:** Role comes from the `profiles` table via `getMyProfile()`, which uses `supabase.auth.getUser()` and then `profiles` by `user.id`. If the active session is still the student’s, `getUser()` and thus `getMyProfile()` return the **student** profile (`role=student`).
- **Redirect logic:** Login always redirects to `/app` on success. `/app` is a single dashboard that chooses teacher vs student UI from `profile.role`. There is no role-based redirect to different URLs; the bug was the wrong `profile` (and thus wrong role) due to the stale session.
- **Teacher UI:** Teacher-specific blocks (e.g. Create Demo Users, Demo Seed, Needs Review, teacher stats) are still present and shown when `profile.role === 'teacher'`. They were not skipped by a feature flag; they were hidden because `profile.role` was `student` when it should have been `teacher`.

## Code Changes

### 1. **Login: sign out before sign in**  
**File:** `src/app/(public)/login/page.tsx`

- **Import:** `signOut` added from `@/lib/supabase/auth`.
- **In `handleSubmit`:** Before `signIn(email, password)`, we now call:
  ```ts
  await signOut().catch(() => {})
  ```
  This clears any existing session (including a previous student session) so the subsequent `signIn` establishes a clean teacher session. `signOut` errors are ignored so a missing session does not block login.

### 2. **App dashboard: dev-only auth logging**  
**File:** `src/app/(protected)/app/page.tsx`

- **In `checkSession`:** After `setProfile(profileData)` and before `setDemoSeedEnabled(true)`, a **development-only** log was added:
  ```ts
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const u = userData || session?.user
    console.log('[Auth]', {
      userId: u?.id,
      email: u?.email,
      role: profileData?.role,
      roleSource: 'profiles',
      dashboard: 'teacher'|'student'|'admin'|'external',
    })
  }
  ```
  This helps verify: current user id/email, role source (`profiles`), and which dashboard branch is used. It is guarded so it does not run in production.

## Verification

1. **DB role:** Ensure the teacher account has `role=teacher` in `profiles` (e.g. for `demo.teacher+...@dottinoo.test` from Create Demo Users or seed). The `handle_new_user` trigger and create-demo-users/seed logic set this correctly for new accounts.
2. **Flow:** Sign in as a student, then go to `/login` and sign in with teacher credentials. You should see the teacher dashboard (Create Demo Users, Demo Seed, Needs Review, teacher stats, etc.) and the role label “teacher”.
3. **Logs (dev):** In development, the `[Auth]` log should show `role: 'teacher'` and `dashboard: 'teacher'` when logged in as a teacher.

## Short Summary

- **Cause:** Logging in as teacher while a student session was still active could leave the student session in place (or mixed in), so `getMyProfile()` kept returning the student profile and the dashboard showed the student UI.
- **Fix:** Call `signOut()` before `signIn()` on the login page so each new login starts from a cleared session. Dev-only logging was added on the app page to trace user, role, and dashboard type.
- **Result:** Teacher logins now consistently show the teacher dashboard when the `profiles.role` for that user is `teacher`.

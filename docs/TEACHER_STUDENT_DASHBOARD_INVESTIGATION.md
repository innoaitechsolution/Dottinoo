# Teacher/Student Dashboard Investigation (Read-Only)

## 1. Should Teacher and Student See Different Pages/Sections?

**Answer: (B) Same page with conditional UI**

- **Single route:** Both teacher and student are redirected to `/app` after login (no separate routes like `/app/teacher` vs `/app/student`).
- **File:** `src/app/(protected)/app/page.tsx`
- **Conditional rendering:** The dashboard renders different sections based on `profile.role`:
  - **Lines 280-281:** `const isTeacher = profile.role === 'teacher'` and `const isStudent = profile.role === 'student'`
  - **Lines 330-430:** `{isTeacher && (<>...</>)}` - Teacher-only sections (Demo Users, Demo Seed, Needs Review, teacher stats)
  - **Lines 432-500:** `{isStudent && (<>...</>)}` - Student-only sections (Next Tasks, student stats)
  - **Lines 790-830:** Quick Links section shows different cards based on `isTeacher || isAdmin` vs `isStudent`
  - **Lines 835-880:** Stats section shows `teacherStats` for teachers/admins, `studentStats` for students/external

**Conclusion:** It's one shared dashboard page (`/app`) with role-based conditional sections. The UI switches based on `profile.role` from the database.

---

## 2. Where the App Decides What to Render After Login

### 2.1 First Route After Login (Redirect Target)

- **File:** `src/app/(public)/login/page.tsx`
- **Lines 44-46:** After successful `signIn()`, redirects to `/app`:
  ```typescript
  if (data?.session) {
    router.push('/app')
    router.refresh()
  }
  ```
- **Note:** Lines 31-34 call `signOut()` before `signIn()` to clear any stale session.

### 2.2 Where Session is Read

- **File:** `src/app/(protected)/app/page.tsx`
- **Lines 36-50:** `useEffect` calls `checkSession()` which:
  - **Line 39:** `supabase.auth.getSession()` - Gets current session
  - **Line 47:** If no session, redirects to `/login`
  - **Line 53:** `supabase.auth.getUser()` - Gets full user object with metadata
  - **Line 54:** Sets `user` state

- **Lines 122-132:** `onAuthStateChange` listener:
  - **Line 123:** If session is null, redirects to `/login`
  - **Line 127:** `supabase.auth.getUser()` on auth change
  - **Line 130:** Reloads profile when auth state changes

### 2.3 Where Profile is Fetched

- **File:** `src/app/(protected)/app/page.tsx`
- **Line 57:** `getMyProfile()` is called inside `checkSession()`
- **Implementation:** `src/lib/supabase/profile.ts`
  - **Lines 33-45:** `getMyProfile()` function:
    - **Line 34:** `supabase.auth.getUser()` - Gets authenticated user
    - **Line 38-42:** Queries `profiles` table: `supabase.from('profiles').select('*').eq('id', user.id).single()`
    - **Returns:** Profile object with `role`, `full_name`, etc.

- **Line 64:** `setProfile(profileData)` - Sets profile state
- **Line 280-281:** Profile is used to determine role: `const isTeacher = profile.role === 'teacher'` and `const isStudent = profile.role === 'student'`

### 2.4 Condition That Switches Student vs Teacher UI

- **File:** `src/app/(protected)/app/page.tsx`
- **Line 280-281:** Role flags are set:
  ```typescript
  const isTeacher = profile.role === 'teacher'
  const isStudent = profile.role === 'student'
  const isAdmin = profile.role === 'admin'
  const isExternal = profile.role === 'external'
  ```

- **Conditional rendering examples:**
  - **Line 330:** `{isTeacher && (<>...</>)}` - Teacher dashboard sections
  - **Line 432:** `{isStudent && (<>...</>)}` - Student dashboard sections
  - **Line 790:** `{isTeacher || isAdmin ? (<>...</>) : (<>...</>)}` - Quick Links
  - **Line 835:** `{(isTeacher || isAdmin) && teacherStats ? (<>...</>) : (isStudent || isExternal) && studentStats ? (<>...</>) : null}` - Stats

- **Data loading (lines 82-108):** Different data is loaded based on role:
  - **Line 84:** `if (profileData.role === 'teacher')` → loads `getTeacherStats()`, `listMyClasses()`, `listTeacherNeedsReview()`
  - **Line 91:** `else if (profileData.role === 'student')` → loads `getStudentStats()`, `listStudentNextTasks()`, `listMyClasses()`

**Critical dependency:** The UI depends entirely on `profile.role` from the `profiles` table. If `profile.role` is wrong or missing, the wrong UI will render.

---

## 3. What SHOULD Happen with Demo Logic

### 3.1 Expected Role Values in `profiles.role`

- **Valid values:** `'student'`, `'teacher'`, `'admin'`, `'external'` (defined in `src/lib/supabase/profile.ts` line 3)
- **Database constraint:** `supabase/sql/001_profiles.sql` line 3: `CHECK (role IN ('student', 'teacher', 'admin', 'external'))`

### 3.2 How Demo Teacher and Student Roles Are Created/Set

#### Demo Users Creation (`/api/demo/create-demo-users`)

- **File:** `src/app/api/demo/create-demo-users/route.ts`
- **Lines 70-85:** Creates teacher:
  - **Line 70:** `adminClient.auth.admin.createUser()` with `user_metadata: { role: 'teacher', full_name: 'Demo Teacher' }`
  - **Lines 87-95:** Upserts profile: `profiles.upsert({ id: teacherAuth.user.id, role: 'teacher', full_name: 'Demo Teacher' })`
- **Lines 97-115:** Creates student:
  - **Line 97:** `adminClient.auth.admin.createUser()` with `user_metadata: { role: 'student', full_name: 'Demo Student' }`
  - **Lines 117-125:** Upserts profile: `profiles.upsert({ id: studentAuth.user.id, role: 'student', full_name: 'Demo Student' })`

#### Demo Seed (`/api/demo/seed`)

- **File:** `src/app/api/demo/seed/route.ts`
- **Lines 120-150:** Creates 3 demo students:
  - **Line 130:** `adminClient.auth.admin.createUser()` with `user_metadata: { role: 'student', full_name: fullName }`
  - **Lines 152-165:** Inserts profile with `role: 'student'` and additional fields (`support_needs_tags`, `digital_skill_level`, `interests`)

#### Automatic Profile Creation (Trigger)

- **File:** `supabase/sql/006_profile_from_auth_metadata.sql`
- **Lines 8-15:** `handle_new_user()` trigger function:
  - **Line 12:** Extracts role from `NEW.raw_user_meta_data->>'role'`
  - **Line 11:** Defaults to `'student'` if role is missing: `COALESCE(NEW.raw_user_meta_data->>'role', 'student')`
  - **Line 13:** Inserts into `profiles` table
- **Lines 20-23:** Trigger fires `AFTER INSERT ON auth.users`

**Expected flow:**
1. Demo API creates `auth.users` record with `user_metadata.role = 'teacher'` or `'student'`
2. Trigger `handle_new_user()` fires automatically
3. Trigger inserts into `profiles` with `role` from metadata (or defaults to `'student'`)
4. API also explicitly upserts `profiles` to ensure it exists and has correct role

### 3.3 What Could Cause Teacher Login to Show Student UI

**Root causes (in order of likelihood):**

1. **Wrong `profiles.role` in database:**
   - Teacher account has `profiles.role = 'student'` instead of `'teacher'`
   - **Check:** Query `SELECT id, role, full_name FROM profiles WHERE id = '<teacher_user_id>'`
   - **Fix:** Update `profiles.role = 'teacher'` for that user

2. **Profile not found or null:**
   - `getMyProfile()` returns `null` or error
   - **Check:** Console log in dev mode (lines 67-76) shows `role: null` or `role: undefined`
   - **Fix:** Ensure profile exists in `profiles` table for that `auth.users.id`

3. **Stale session (partially addressed):**
   - Previous student session not fully cleared
   - **Current fix:** `signOut()` before `signIn()` in login (line 34)
   - **Remaining risk:** If `signOut()` fails silently, old session might persist
   - **Check:** Browser DevTools → Application → Local Storage → `sb-<project>-auth-token` should be cleared before new login

4. **Race condition:**
   - Profile loads after initial render, showing default/loading state
   - **Check:** `isLoading` state (line 26) - if `true`, dashboard shows "Loading..." (line 250)
   - **Timing:** Profile fetch happens in `useEffect`, so there's a brief moment where `profile` is `null`

5. **OAuth users defaulting to student:**
   - If teacher signed up via OAuth (Google), trigger defaults to `'student'` if metadata lacks `role`
   - **Check:** `auth.users.raw_user_meta_data->>'role'` should be `'teacher'` for OAuth-created teachers
   - **Fix:** Manually update `profiles.role = 'teacher'` or ensure OAuth signup includes role metadata

6. **Multiple profiles or ID mismatch:**
   - `auth.users.id` doesn't match `profiles.id`
   - **Check:** `SELECT auth.users.id, profiles.id FROM auth.users LEFT JOIN profiles ON auth.users.id = profiles.id WHERE auth.users.email = '<teacher_email>'`

---

## 4. Checklist to Verify Role Separation (No Code Changes)

### 4.1 Browser Console Logs

1. **Open browser DevTools (F12) → Console tab**
2. **Log in as teacher**
3. **Look for `[Auth]` log (development mode only):**
   - **Location:** `src/app/(protected)/app/page.tsx` lines 67-76
   - **Expected output:**
     ```javascript
     [Auth] {
       userId: "<uuid>",
       email: "demo.teacher+<timestamp>@dottinoo.test",
       role: "teacher",  // ← Should be "teacher"
       roleSource: "profiles",
       dashboard: "teacher"
     }
     ```
   - **If `role: "student"` or `role: null`:** Profile has wrong role or is missing

4. **Check for errors:**
   - `Error loading profile:` → Profile fetch failed
   - `Error checking session:` → Session check failed

### 4.2 Database Queries (Supabase SQL Editor)

Run these queries in Supabase Dashboard → SQL Editor:

#### Query 1: Check Teacher Profile
```sql
-- Replace <teacher_email> with actual teacher email
SELECT 
  au.id as auth_user_id,
  au.email,
  au.raw_user_meta_data->>'role' as metadata_role,
  p.id as profile_id,
  p.role as profile_role,
  p.full_name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = '<teacher_email>';
```

**Expected result:**
- `metadata_role` should be `'teacher'` (or `null` if created via API)
- `profile_role` **MUST** be `'teacher'` ← This is what the UI reads
- `profile_id` should match `auth_user_id`

#### Query 2: List All Demo Users
```sql
SELECT 
  au.email,
  au.created_at as auth_created,
  p.role,
  p.full_name,
  p.created_at as profile_created
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email LIKE 'demo.%@dottinoo.test'
ORDER BY au.created_at DESC;
```

**Expected result:**
- Teacher emails should have `role = 'teacher'`
- Student emails should have `role = 'student'`
- No `NULL` roles

#### Query 3: Check for Role Mismatches
```sql
-- Find users where metadata role doesn't match profile role
SELECT 
  au.email,
  au.raw_user_meta_data->>'role' as metadata_role,
  p.role as profile_role,
  CASE 
    WHEN au.raw_user_meta_data->>'role' != p.role THEN 'MISMATCH'
    WHEN p.role IS NULL THEN 'MISSING PROFILE'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email LIKE 'demo.%@dottinoo.test'
  AND (au.raw_user_meta_data->>'role' != p.role OR p.role IS NULL);
```

**Expected result:** Empty result set (no mismatches)

### 4.3 UI Verification Steps

1. **Log in as teacher:**
   - Email: `demo.teacher+<timestamp>@dottinoo.test`
   - Password: `DottinooDemo123!`
   - **Expected:** Dashboard shows:
     - "Create Demo Users" card (if `DEMO_SEED_ENABLED=true`)
     - "Demo Seed" card
     - "Needs Review" panel (if submissions exist)
     - Quick Links: "Classes", "Tasks", "Create Task"
     - Stats: "Tasks Created", "Submissions Submitted", "Submissions Reviewed"

2. **Log in as student:**
   - Email: `demo.student+<timestamp>@dottinoo.test` (or `demo.student1+<timestamp>@dottinoo.test`)
   - Password: `DottinooDemo123!`
   - **Expected:** Dashboard shows:
     - "Your Next Tasks" panel
     - Quick Links: "My Tasks", "Stars", "Classes"
     - Stats: "Assigned Tasks", "Submitted", "Reviewed", "Total Stars"

3. **Check account info (top of dashboard):**
   - **Location:** `src/app/(protected)/app/page.tsx` lines 300-320
   - **Expected for teacher:** Shows email, provider, **role: "teacher"**
   - **Expected for student:** Shows email, provider, **role: "student"**
   - **If role shows "student" for teacher login:** Profile has wrong role

### 4.4 Network Tab Verification

1. **Open DevTools → Network tab**
2. **Log in as teacher**
3. **Filter by "Fetch/XHR"**
4. **Look for profile query:**
   - **Request:** `GET /rest/v1/profiles?id=eq.<user_id>&select=*`
   - **Response:** Should contain `{"role": "teacher", ...}`
   - **If `role: "student"`:** Database has wrong role

### 4.5 Local Storage Check

1. **Open DevTools → Application → Local Storage → `https://<your-domain>`**
2. **Look for Supabase session keys:**
   - `sb-<project-id>-auth-token`
   - `sb-<project-id>-auth-token-code-verifier`
3. **After logging out and logging in as teacher:**
   - Old session tokens should be cleared
   - New session token should be present
   - **If old tokens persist:** `signOut()` may have failed

### 4.6 Quick Diagnostic Query

Run this single query to see everything at once:

```sql
-- Comprehensive check for a specific email
WITH user_info AS (
  SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'role' as metadata_role,
    au.created_at as auth_created,
    p.role as profile_role,
    p.full_name,
    p.created_at as profile_created
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE au.email = '<teacher_email>'
)
SELECT 
  email,
  metadata_role,
  profile_role,
  CASE 
    WHEN profile_role IS NULL THEN '❌ PROFILE MISSING'
    WHEN profile_role != 'teacher' THEN '❌ WRONG ROLE: ' || profile_role
    WHEN metadata_role IS NULL AND profile_role = 'teacher' THEN '⚠️  Role set manually (no metadata)'
    ELSE '✅ OK'
  END as status,
  full_name,
  auth_created,
  profile_created
FROM user_info;
```

---

## Conclusion

**Based on code, teacher vs student experiences are: (B) Same page with conditional UI**

- Both roles land on `/app` after login
- The dashboard (`src/app/(protected)/app/page.tsx`) conditionally renders sections based on `profile.role`
- The critical dependency is `profiles.role` from the database, fetched via `getMyProfile()` which queries `profiles` table using `auth.users.id`
- If a teacher sees the student dashboard, the most likely cause is `profiles.role = 'student'` for that user's ID in the database
- The fix in `login/page.tsx` (calling `signOut()` before `signIn()`) addresses stale session issues, but cannot fix incorrect database role values

**To diagnose:** Run the SQL queries above to verify `profiles.role` matches the expected value for the teacher account.

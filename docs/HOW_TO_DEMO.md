# How to Demo - Quick Guide

## 🎯 Demo Setup

### 1. Run Database Migration
Before using student accessibility features, run this migration in Supabase SQL Editor:
```sql
-- Run: supabase/sql/014_ui_preferences.sql
```

### 2. Create Demo Accounts
1. Login as any teacher/admin account
2. Go to `/app/teacher`
3. Click "Create demo teacher + student"
4. Copy the credentials (or use Demo Seed for full setup)

---

## 👨‍🏫 Teacher Demo Flow

### Step 1: Login
- Email: `demo.teacher+<timestamp>@dottinoo.test`
- Password: `DottinooDemo123!`
- **Result:** Lands on `/app/teacher` dashboard

### Step 2: Create Class
1. Click "Classes" → "Create Class"
2. Enter class name (e.g., "Demo Class 2024")
3. Copy the invite code

### Step 3: Create Task (3 Ways)

#### Option A: Manual Task
1. Go to "Tasks" → "Create Task"
2. Fill in:
   - Class selection
   - Title, Instructions
   - Steps (add multiple)
   - Differentiation (easier/standard/stretch)
   - Success criteria
   - Due date (optional)
3. Assign to class or selected students
4. Click "Create Task"

#### Option B: Template Task (⚠️ Needs UI Integration)
- **Status:** Template library exists but needs UI integration
- **Location:** `src/lib/templates/taskTemplates.ts` (8 templates ready)
- **To Complete:** Add template selector to task creation page

#### Option C: AI-Generated Task (⚠️ Needs UI Integration)
- **Status:** AI API exists but needs UI integration
- **API:** `/api/ai/task-draft` (works with mock or OpenAI)
- **To Complete:** Add AI mode to task creation page

### Step 4: Review Submissions
1. Go to "Tasks" → Click on a task
2. See "Review Queue" with student submissions
3. For each submission:
   - Read student's work
   - Add feedback text
   - Award stars (0-5)
   - Click "Review"
4. **Note:** Quick feedback templates not yet added (see TODO)

### Step 5: View Reports
1. Go to "Reports" (in Quick Links or navigation)
2. Select a class
3. View summary stats:
   - Total tasks, assignments
   - Submitted, reviewed counts
   - Total stars awarded
4. View per-student breakdown table
5. Click "Export CSV" to download report

---

## 👨‍🎓 Student Demo Flow

### Step 1: Login
- Email: `demo.student+<timestamp>@dottinoo.test` (or from Demo Seed)
- Password: `DottinooDemo123!`
- **Result:** Lands on `/app/student` dashboard

### Step 2: Join Class
1. Go to "Classes"
2. Enter invite code from teacher
3. Click "Join Class"

### Step 3: Customize Accessibility (NEW!)
1. Click "⚙️ Settings" button (top right)
2. Adjust settings:
   - **Color Theme:** Default / High Contrast / Pastel / Dyslexia Friendly
   - **Font Size:** Small / Medium / Large
   - **Line Spacing:** Normal / Relaxed / Loose
   - **Letter Case:** Normal / lowercase / UPPERCASE
   - **Simplified Layout:** Toggle for reduced clutter
3. Click "Save Settings"
4. Settings apply immediately and persist

### Step 4: View Tasks
1. Go to "My Tasks"
2. See list of assigned tasks with status
3. Click on a task to view details

### Step 5: Complete & Submit Task
1. Open a task
2. Read instructions, steps, success criteria
3. Complete the work
4. Enter submission text
5. (Optional) Upload a file
6. Click "Submit Task"

### Step 6: View Feedback
1. After teacher reviews, go back to task
2. See teacher feedback
3. See stars awarded (⭐)
4. View status: "Reviewed"

### Step 7: View Stars
1. Go to "Stars"
2. See total stars earned
3. See recent reviews

---

## 🔍 What's Working vs. What Needs Work

### ✅ Fully Working:
- Role-based dashboards (`/app/teacher` and `/app/student`)
- Role badges and user info display
- Student accessibility settings (UI + persistence)
- Manual task creation
- Task assignment to classes/students
- Student submission (text + file)
- Teacher review (feedback + stars)
- Reports with CSV export
- Class management
- Student skill profiles (in class management)

### ⚠️ Needs Integration (Code Ready, UI Missing):
- **Template Library:** 8 templates exist in code, need UI in task creation
- **AI Draft:** API works, need UI in task creation
- **Quick Feedback:** Need template buttons in review page

### 📝 Needs CSS:
- **Accessibility Themes:** Settings save but CSS rules need to be created to actually style pages

---

## 🐛 Troubleshooting

### Teacher sees student dashboard?
- **Check:** Browser console for `[Auth]` log - should show `role: "teacher"`
- **Fix:** Verify `profiles.role = 'teacher'` in database for that user
- **SQL:** `SELECT id, role FROM profiles WHERE email = '<teacher_email>'`

### Student accessibility not working?
- **Check:** Migration `014_ui_preferences.sql` has been run
- **Check:** Settings are saving (check `profiles.ui_preferences` in database)
- **Note:** CSS themes need to be created for visual changes

### Can't create tasks?
- **Check:** Teacher has at least one class created
- **Check:** Class has students (for student-specific assignment)

---

## 📊 Demo Checklist

### Before Demo:
- [ ] Run migration `014_ui_preferences.sql`
- [ ] Create demo accounts (teacher + student)
- [ ] Create at least one class
- [ ] Test teacher login → `/app/teacher`
- [ ] Test student login → `/app/student`

### During Demo:
- [ ] Show teacher dashboard with role badge
- [ ] Create a class and share invite code
- [ ] Create a task (manual mode works)
- [ ] Show student joining class
- [ ] Show student accessibility settings
- [ ] Show student submitting task
- [ ] Show teacher reviewing submission
- [ ] Show reports with CSV export

### Optional (If Time):
- [ ] Show student skill profiles in class management
- [ ] Show task differentiation (easier/standard/stretch)
- [ ] Show file upload in submission

---

## 🎨 Visual Improvements Made

1. **Role Badges:** Clear visual indicators (👤 Teacher / 👤 Student)
2. **Separate Dashboards:** Distinct experiences for each role
3. **Settings Panel:** Clean accessibility UI for students
4. **Reports Page:** Professional table layout with export

---

## 📝 Next Steps to Complete Demo

1. **Integrate Templates** (2-3 hours):
   - Add mode selector to task creation
   - Show template library
   - Pre-fill form from template

2. **Integrate AI Draft** (2-3 hours):
   - Add AI mode to task creation
   - Create form for AI inputs
   - Call API and populate form

3. **Add Quick Feedback** (1-2 hours):
   - Add template buttons to review page
   - One-click feedback insertion

4. **Create Accessibility CSS** (1-2 hours):
   - Define theme colors
   - Font size scaling
   - Line spacing rules
   - Letter case transforms

**Total:** 6-10 hours for complete implementation

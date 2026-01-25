# Dottinoo - Narrative + Demo Playbook + Checklists

**Status:** Active  
**Last Updated:** 2026-01-25  
**Purpose:** Demo narrative variants, 10-minute demo script, pre-demo checklist, and trial metrics for demo day and award submissions.

---

# Dottinoo - Narrative + Demo Playbook + Checklists

## PART 3 — NARRATIVE + DEMO PLAYBOOK + CHECKLISTS

### A. Narrative Variants

#### Variant 1: Very Short (120-150 words)

**Dottinoo: Inclusive Education Platform for UK Classrooms**

Dottinoo empowers UK teachers to create personalized, differentiated tasks in minutes through manual creation, pre-built templates, or AI-assisted drafting. Designed for learners aged 14-24, the platform addresses the critical challenge of meeting diverse student needs while reducing teacher workload.

Students benefit from fully customizable accessibility settings—color themes, font sizes, line spacing, and layout options—ensuring every learner can engage with content effectively. Teachers can assign tasks to whole classes or target specific students based on support needs and skill levels, then provide rapid feedback with AI-assisted suggestions and one-click star awards.

Built-in reporting gives schools visibility into task completion, submission rates, and student progress. Dottinoo combines innovation with inclusion, making personalized education scalable and sustainable.

**Dottinoo is a product by InnoAl Tech Solutions.**

---

#### Variant 2: Standard (250-350 words)

**Dottinoo: Transforming Inclusive Education Through Technology**

Dottinoo is an education platform designed specifically for UK classrooms, supporting learners aged 14-24. We solve a critical problem: teachers spend excessive time creating differentiated tasks for diverse learners, while students with varying needs struggle with one-size-fits-all content.

**Innovation in Task Creation:**
Teachers can create tasks in three ways. Manual mode offers full control. Template mode provides eight pre-built task structures (essay, research, presentation, etc.) that pre-fill forms for quick editing. AI-assisted mode uses Gemini AI to generate structured task drafts that automatically consider student support needs and differentiation levels.

**Inclusion at the Core:**
Every student can customize their learning interface. Accessibility settings include color themes (high contrast, pastel, dyslexia-friendly), adjustable font sizes, line spacing options, letter case preferences, and simplified layout modes. Settings persist across sessions and can be preset based on support needs tags, with student override.

**Efficient Review Workflow:**
Teachers review submissions through a streamlined queue. Quick feedback buttons provide one-click responses, while optional AI feedback suggestions offer personalized guidance. Stars (0-5) reward effort and achievement. The entire review cycle is designed to reduce time from submission to feedback.

**Visibility and Progress:**
Built-in reporting provides per-class and per-student summaries, tracking task creation, assignments, submissions, reviews, and stars awarded. CSV export enables schools to integrate data into existing systems.

**Technical Excellence:**
Built on Next.js and Supabase, Dottinoo uses Row Level Security to ensure data privacy, provider abstraction for AI flexibility, and graceful degradation when AI is unavailable. The platform is designed for scalability, security, and accessibility compliance.

**Impact:**
Dottinoo reduces teacher workload, accelerates feedback cycles, and ensures every learner can engage with content in a way that works for them. We believe inclusive education should be the default, not the exception.

**Dottinoo is a product by InnoAl Tech Solutions.**

---

#### Variant 3: Detailed (600-800 words)

**Dottinoo: A Comprehensive Platform for Inclusive Education in UK Classrooms**

**Introduction:**
Dottinoo is an education platform designed specifically for UK secondary schools and colleges, supporting learners aged 14-24. We address a fundamental challenge in modern education: how to provide personalized, differentiated learning experiences at scale while reducing teacher workload and ensuring every student can access content effectively.

**The Problem We Solve:**
UK classrooms are increasingly diverse. Students have varying needs: some require SEND support, others need accessibility accommodations, and many have different digital skill levels. Teachers face the dual challenge of creating differentiated tasks for each learner while managing large classes and tight schedules. Traditional approaches—one-size-fits-all tasks or manual differentiation for every student—are unsustainable.

Feedback cycles are another bottleneck. Students submit work, teachers review it days or weeks later, and learning momentum is lost. Schools lack visibility into completion rates, submission patterns, and student progress, making it difficult to identify and support struggling learners early.

**Our Solution: Three-Track Task Creation**

Dottinoo offers teachers three ways to create tasks, each suited to different needs and time constraints:

1. **Manual Mode:** For experienced teachers who want full control, manual mode provides a comprehensive form for task creation, including title, instructions, steps, differentiation (easier/standard/stretch), success criteria, and assignment targeting.
2. **Template Mode:** Eight pre-built task templates (essay, research project, presentation, debate, creative writing, problem-solving, reflection, and portfolio) pre-fill the task form. Teachers select a template, customize it, and assign it in minutes. Templates include built-in differentiation and success criteria aligned to common learning objectives.
3. **AI-Assisted Mode:** Powered by Google's Gemini AI, this mode generates structured task drafts from a brief description. The AI considers the subject, time estimate, and—critically—the support needs of selected students. It produces a complete task structure that teachers can review, edit, and assign. If AI is unavailable or disabled, the system gracefully falls back to mock responses, ensuring the workflow never breaks.

**Inclusion Built-In: Student Accessibility**

Every student can customize their learning interface to match their needs:

- **Color Themes:** Default, high contrast (for visual impairments), pastel (for sensitivity), and dyslexia-friendly (optimized color combinations and contrast)
- **Font Sizes:** Small, medium, or large, with immediate visual feedback
- **Line Spacing:** Normal, relaxed, or loose for readability
- **Letter Case:** Normal, lowercase, or uppercase (applied to content, not inputs)
- **Simplified Layout:** Toggle to reduce visual clutter and focus on content

Settings are stored in the database (`profiles.ui_preferences`) and apply globally across all student pages. Teachers can set default presets based on `support_needs_tags`, but students can always override these settings. This ensures that accessibility is not a one-time accommodation but an ongoing, student-controlled experience.

**Efficient Review and Feedback**

Teachers review submissions through a streamlined queue interface. Each submission shows the student's name, submission time, content preview, and optional file attachment. Quick feedback buttons provide one-click responses for common scenarios ("Great job", "Next step", "Be more specific", etc.), while optional AI feedback suggestions offer personalized, constructive guidance.

Stars (0-5) provide immediate positive reinforcement. The review workflow is designed to take seconds per submission, not minutes. This speed enables teachers to provide timely feedback that maintains learning momentum.

**Visibility and Reporting**

Built-in reporting gives schools and teachers visibility into their classes:

- **Summary Metrics:** Total tasks created, assignments made, submissions received, reviews completed, stars awarded
- **Per-Student Breakdown:** Individual completion rates, submission counts, stars earned, skill levels
- **CSV Export:** All data can be exported for integration with school information systems

This visibility helps teachers identify students who need additional support, recognize high achievers, and adjust their teaching strategies based on data.

**Technical Architecture and Security**

Dottinoo is built on modern, scalable technologies:

- **Frontend:** Next.js 14 with App Router, TypeScript, CSS Modules
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **AI:** Provider abstraction layer (Gemini/Mock) for flexibility and cost control
- **Security:** Row Level Security (RLS) on all database tables, server-side auth checks in API routes, no PII in AI prompts
- **Deployment:** Netlify with environment-based configuration

The architecture ensures data privacy, scalability, and graceful degradation. If AI services are unavailable, the platform continues to function with mock responses. If network issues occur, core features remain accessible.

**Impact and Vision**

Dottinoo has been designed and tested with UK classrooms in mind. We understand the constraints teachers face: limited time, diverse student needs, and pressure to demonstrate progress. Our platform addresses these challenges by:

- Reducing task creation time from hours to minutes
- Enabling rapid, personalized feedback
- Providing visibility into student progress
- Ensuring every student can access content effectively

We believe inclusive education should be the default, not the exception. Dottinoo makes personalized, differentiated learning scalable and sustainable.

**Future Directions**

While our current MVP focuses on task creation, assignment, submission, and review, we envision expanding to include peer review, video/audio submissions, mobile apps, and advanced analytics. However, our core mission remains: empowering teachers and ensuring every learner can succeed.

**Dottinoo is a product by InnoAl Tech Solutions.**

---

### B. Demo Day Playbook

#### 10-Minute Demo Plan (Minute-by-Minute)

**Minute 0-1: Opening & Landing Page**

- Show landing page: "Tasks that adapt to every learner"
- Highlight: "Built for UK classrooms, designed for ages 14-24"
- Show feature chips: "Manual • Templates • AI drafts — plus accessibility settings and reporting"
- Click "Get started" → show auth entry (don't login yet)

**Minute 1-2: Teacher Login & Dashboard**

- Login as teacher (pre-created demo account)
- Show `/app/teacher` dashboard
- Point out role badge and email (demo clarity)
- Show quick links: Classes, Tasks, Reports

**Minute 2-3: Create Class & Task (Template Mode)**

- Go to Classes → Create Class → "Demo Class 2024"
- Copy invite code (show it)
- Go to Tasks → Create Task
- Switch to "Template" mode
- Select a template (e.g., "Research Project")
- Show pre-filled form → edit title → save
- Assign to class → Create Task

**Minute 3-4: AI Task Creation (If Time)**

- Create another task → Switch to "AI Assist"
- Enter brief: "Create a task about climate change for 30 minutes"
- Select students (if available) → Generate Draft
- Show AI-generated content → edit if needed → save

**Minute 4-5: Student Experience**

- Open incognito/private window (or switch account)
- Login as student (pre-created)
- Show `/app/student` dashboard
- Join class (paste invite code from teacher)
- Go to My Tasks → show assigned task
- **Accessibility Settings:**
  - Click Settings button (⚙️)
  - Change color theme to "High Contrast" → show visual change
  - Increase font size → show change
  - Save settings

**Minute 5-6: Student Submission & AI Help**

- Open task detail
- Show AI Help section:
  - Click "Simplify" → show rewritten instructions (don't overwrite original)
  - Click "Get a hint" → "Next step" → show hint
- Complete task (enter sample text)
- Upload optional file (if time)
- Submit task

**Minute 6-7: Teacher Review**

- Switch back to teacher account
- Go to Tasks → open task with submission
- Show Review Queue
- Click "🤖 AI feedback suggestions" → show suggestions
- Click a suggestion to insert into feedback
- Use quick feedback button ("Great job")
- Award stars (4) → Review

**Minute 7-8: Reports**

- Go to Reports
- Select class
- Show summary: tasks, assignments, submissions, reviews, stars
- Show per-student breakdown table
- Click "Export CSV" → show download (or explain it downloads)

**Minute 8-9: Differentiation & Skills (Optional)**

- Go to Classes → Manage Students
- Show student skill profiles (if time)
- Show task differentiation (easier/standard/stretch) in task detail

**Minute 9-10: Q&A & Closing**

- Answer questions
- Highlight key differentiators:
  - Three-track task creation (Manual/Template/AI)
  - Built-in accessibility
  - Fast review workflow
  - Reporting and visibility

---

#### Plan B: If AI is Disabled

**Substitute AI sections with:**

- **Task Creation:** Focus on Template mode (show multiple templates)
- **Review:** Skip AI feedback suggestions, emphasize quick feedback buttons
- **Student Help:** Show AI help section but explain it's disabled → show mock/fallback behavior

**Key Message:** "AI enhances the experience but isn't required. The platform works fully with manual and template modes."

**Revised Timeline:**

- **Minute 0-2:** Same (landing, login, dashboard)
- **Minute 2-4:** Create class, show Template mode (emphasize 8 templates available)
- **Minute 4-5:** Show Manual mode (full control)
- **Minute 5-6:** Student experience (same)
- **Minute 6-7:** Teacher review (emphasize quick feedback buttons, skip AI suggestions)
- **Minute 7-8:** Reports (same)
- **Minute 8-10:** Q&A

---

#### Plan C: If Network Issues

**Offline-Friendly Demo Path:**

1. Pre-load pages (teacher dashboard, student dashboard)
2. Show static screenshots of:
   - Task creation form (template selected)
   - Student accessibility settings
   - Review queue
   - Reports page
3. Explain workflows verbally
4. Have backup: Recorded video demo (screen recording)

**Key Message:** "The platform is cloud-based, but we have offline-friendly workflows and can demonstrate core features even with limited connectivity."

**Alternative Approach:**

- Use local development environment (if available)
- Show code structure and architecture
- Explain data model and security
- Discuss scalability and deployment

---

### C. Pre-Demo Smoke Test Checklist (15 Minutes)

**Critical Paths:**

**Teacher Flow (5 minutes):**

- [ ] Login as teacher → lands on `/app/teacher`
- [ ] Create class → get invite code
- [ ] Create task (Manual) → assign to class → save
- [ ] Create task (Template) → select template → pre-fills → save
- [ ] Create task (AI) → enter brief → generate → pre-fills → save (or shows mock)
- [ ] View task → see assignments
- [ ] Review submission → add feedback + stars → submit
- [ ] Reports → select class → view stats → export CSV

**Student Flow (5 minutes):**

- [ ] Login as student → lands on `/app/student`
- [ ] Join class (invite code from teacher)
- [ ] View My Tasks → see assigned task
- [ ] Open task → view details
- [ ] Accessibility Settings → change theme → save → verify persists
- [ ] AI Help → "Simplify" → shows rewritten text
- [ ] AI Help → "Get a hint" → "Next step" → shows hint
- [ ] Submit task (text + optional file)
- [ ] View feedback and stars (after teacher reviews)

**AI Checks (3 minutes):**

- [ ] AI task draft: Generate → verify response (or mock fallback)
- [ ] AI feedback: Click button → verify suggestions (or mock fallback)
- [ ] AI rewrite: Click "Simplify" → verify rewritten text
- [ ] AI hints: Click "Next step" → verify hint (with guardrails)

**Reports Export (2 minutes):**

- [ ] Reports page loads
- [ ] Select class → stats display
- [ ] Per-student table shows data
- [ ] CSV export downloads (or shows download prompt)

**Accessibility (2 minutes):**

- [ ] Settings save to database
- [ ] Visual changes apply immediately
- [ ] Settings persist after refresh
- [ ] Multiple themes work (high contrast, pastel, dyslexia-friendly)

---

### D. "What to Measure" (Trial Metrics)

**Quantitative Metrics:**

1. **Teacher Time Saved:**

   - Time to create task: Manual vs Template vs AI
   - Time to review submission: With quick feedback vs without
   - Total time saved per week/month
2. **Completion Rates:**

   - % of assigned tasks submitted
   - % of submissions reviewed within 24/48 hours
   - Average time from assignment to submission
3. **Submission/Review Cycle Time:**

   - Average time from submission to review
   - Average time from review to student viewing feedback
4. **Accessibility Settings Usage:**

   - % of students who customize settings
   - Most common settings (themes, font sizes)
   - Settings changed over time (adaptation)
5. **AI Feature Adoption:**

   - % of tasks created via AI mode
   - % of reviews using AI feedback suggestions
   - % of students using AI help features
6. **Task Creation Mode Distribution:**

   - Manual: X%
   - Template: X%
   - AI: X%

**Qualitative Feedback Questions:**

**For Teachers:**

1. How does Dottinoo compare to your previous task creation method?
2. Which task creation mode do you prefer and why?
3. How has the review workflow changed your feedback frequency?
4. What features do you find most valuable?
5. What would you change or add?
6. Would you recommend Dottinoo to other teachers? Why/why not?

**For Students:**

1. How easy is it to use Dottinoo?
2. Do the accessibility settings help you?
3. How useful are the AI help features?
4. How does receiving quick feedback affect your learning?
5. What would make Dottinoo better for you?

**For School Administrators:**

1. How does the reporting help you understand student progress?
2. What additional metrics would be useful?
3. How does Dottinoo fit into your school's digital strategy?

**Success Criteria (Trial):**

- Teacher time saved: ≥30% reduction in task creation time
- Review cycle: ≥50% of submissions reviewed within 24 hours
- Student satisfaction: ≥70% positive feedback on accessibility features
- Completion rates: ≥80% of assigned tasks submitted
- Adoption: ≥60% of teachers use Template or AI mode at least once

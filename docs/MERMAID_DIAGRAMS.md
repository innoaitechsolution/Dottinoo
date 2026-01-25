# Dottinoo - Mermaid Diagrams

**Status:** Reference  
**Last Updated:** 2026-01-25  
**Purpose:** System architecture, authentication flow, and teacher/student flow diagrams using Mermaid syntax.

---

# Dottinoo - Mermaid Diagrams

## PART 1 — MERMAID DIAGRAMS

### 1. System Architecture (High Level)

```mermaid
graph TB
    subgraph Client["Client"]
        A["Next.js App"]
        A1["Public Landing"]
        A2["Auth Pages"]
        A3["Protected App Routes"]
    end
    
    subgraph Supabase["Supabase Backend"]
        B1["Auth Service"]
        B2["PostgreSQL Database"]
        B3["Storage Bucket"]
        B4["RLS Policies"]
        B5["RPC Functions"]
    end
    
    subgraph AI["AI Layer"]
        C1["Provider Abstraction"]
        C2["Gemini Provider"]
        C3["Mock Provider"]
    end
    
    subgraph Deploy["Deployment"]
        D["Netlify"]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A2 --> B1
    A3 --> B1
    A3 --> B2
    A3 --> B3
    A3 --> C1
    B2 --> B4
    B2 --> B5
    C1 --> C2
    C1 --> C3
    A --> D
    D --> B1
    D --> B2
```

### 2. Auth + Role Routing Flow

```mermaid
flowchart TD
    Start([User visits root]) --> CheckAuth{Authenticated?}
    CheckAuth -->|No| Landing[Landing Page]
    CheckAuth -->|Yes| AppRoute[App Route]
    
    Landing --> GetStarted[Get Started Button]
    GetStarted --> AuthEntry[Auth Entry Screen]
    AuthEntry --> OAuth{Sign in method?}
    OAuth -->|Google| GoogleAuth[Google OAuth]
    OAuth -->|Email| Signup[Signup Page]
    Signup --> Login[Login Page]
    GoogleAuth --> AppRoute
    Login --> AppRoute
    
    AppRoute --> GetProfile[Fetch profile role]
    GetProfile --> RoleCheck{User Role?}
    
    RoleCheck -->|teacher/admin| TeacherDash[Teacher Dashboard]
    RoleCheck -->|student/external| StudentDash[Student Dashboard]
    RoleCheck -->|unknown| Login
    
    TeacherDash --> TeacherNav[Classes, Tasks, Reports]
    StudentDash --> StudentNav[My Tasks, Classes, Stars]
```

### 3. Teacher Flow (End-to-End)

```mermaid
sequenceDiagram
    participant T as Teacher
    participant App as Next.js App
    participant DB as Supabase DB
    participant AI as AI Provider
    participant S as Student
    
    T->>App: Login
    App->>DB: Authenticate
    DB-->>App: Session and role
    App-->>T: Teacher Dashboard
    
    T->>App: Create Class
    App->>DB: INSERT classes
    DB-->>App: class_id and invite_code
    App-->>T: Show invite code
    
    T->>App: Create Task
    alt AI Mode
        App->>AI: Generate draft
        AI-->>App: Task draft
    end
    App->>DB: INSERT tasks
    App->>DB: INSERT task_assignments
    DB-->>App: Task created
    
    S->>App: Join class
    S->>App: View task
    S->>App: Submit work
    App->>DB: INSERT submissions
    
    T->>App: View submissions
    T->>App: Review with feedback and stars
    App->>DB: UPDATE task_assignments
    App->>DB: Call review_task RPC
    
    T->>App: View Reports
    App->>DB: Aggregate stats
    DB-->>App: CSV data
    App-->>T: Export CSV
```

### 4. Student Flow (End-to-End)

```mermaid
flowchart TD
    Start([Student Login]) --> Dashboard[Student Dashboard]
    Dashboard --> JoinClass[Join Class via Invite Code]
    JoinClass --> ViewTasks[View My Tasks]
    
    ViewTasks --> TaskDetail[Open Task]
    TaskDetail --> AccessSettings{Accessibility Settings?}
    AccessSettings -->|Yes| Settings[Adjust Theme Font Spacing]
    Settings --> SaveSettings[Save UI Preferences]
    SaveSettings --> TaskDetail
    
    TaskDetail --> AIHelp{Need AI Help?}
    AIHelp -->|Simplify| Rewrite[AI Rewrite Instructions]
    AIHelp -->|Hint| Hints[Get Hints Checklist Questions]
    Rewrite --> TaskDetail
    Hints --> TaskDetail
    
    TaskDetail --> Complete[Complete Work]
    Complete --> Submit[Submit Text and Optional File]
    Submit --> WaitReview[Wait for Teacher Review]
    WaitReview --> Feedback[View Feedback and Stars]
    Feedback --> StarsPage[View Stars Page]
```

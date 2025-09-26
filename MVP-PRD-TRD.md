# AI Task Scheduler MVP - Product & Technical Requirements Document

## Product Requirements Document (PRD)

### 1. Product Vision
Build a focused AI-powered tool that transforms project briefs into actionable task lists with smart resource assignments, specifically for digital agencies seeking to validate market demand.

### 2. Success Metrics
- **Primary**: 80%+ task accuracy as rated by users
- **Secondary**: 50%+ time reduction in project planning
- **Tertiary**: 70%+ user retention after 30 days

### 3. Core User Stories

#### Epic 1: Project Input & Task Generation
**As a** project manager at a digital agency
**I want to** input a project brief and get AI-generated tasks
**So that** I can save time on initial project breakdown

**Acceptance Criteria:**
- User can paste/type project description (max 5000 characters)
- AI generates 5-20 tasks with estimates (hours)
- User can edit, add, or remove tasks
- User can adjust time estimates
- System saves project for future reference

#### Epic 2: Resource Management & Assignment
**As a** project manager
**I want to** define my team and get AI assignment suggestions
**So that** I can optimize resource allocation

**Acceptance Criteria:**
- User can add team members with basic info (name, role, hours/week)
- AI suggests task assignments based on role and availability
- User can override any assignment
- System shows workload distribution across team

#### Epic 3: Schedule Export
**As a** project manager
**I want to** export the final schedule
**So that** I can use it in my existing project management tools

**Acceptance Criteria:**
- Export to CSV format
- Includes task name, assignee, estimate, priority
- Compatible with Asana import format

### 4. Functional Requirements

#### 4.1 User Authentication
- Simple email/password registration
- Basic user profile (name, company)
- Session management

#### 4.2 Project Management
- Create new project with title and description
- View list of user's projects
- Edit/delete projects
- Project status tracking (Draft, In Progress, Completed)

#### 4.3 AI Task Generation
- LLM integration for task breakdown
- Priority scoring (1-100 scale)
- Time estimation (hours)
- Task dependencies (simple parent/child)

#### 4.4 Team Management
- Add/edit/remove team members
- Basic roles: Designer, Developer, Manager, Copywriter, Other
- Weekly availability (hours)
- Skills tags (optional)

#### 4.5 Assignment Engine
- Bandwidth-based matching algorithm
- Role-appropriate task assignment
- Workload balance visualization
- Manual override capability

### 5. Non-Functional Requirements
- Response time: <3 seconds for AI generation
- Uptime: 99% availability
- Data persistence: All user data saved
- Security: Basic authentication, HTTPS only

### 6. Out of Scope (v2+)
- Real-time PM tool integration
- Complex dependency management
- Multi-project scheduling
- Team collaboration features
- Mobile app

---

## Technical Requirements Document (TRD)

### 1. System Architecture

```
┌─────────────────────────────────────────┐    ┌─────────────────┐
│           Next.js Full Stack            │    │   External      │
│                                         │◄──►│   (LLM APIs)    │
│ ┌─────────────┐   ┌─────────────────┐   │    │                 │
│ │  Frontend   │   │   API Routes    │   │    │ • OpenRouter    │
│ │  (React)    │◄──┤   (Node.js)     │   │    │ • Gemini API    │
│ │             │   │                 │   │    │                 │
│ │ • Pages     │   │ • REST APIs     │   │    │                 │
│ │ • Components│   │ • Business Logic│   │    │                 │
│ │ • UI State  │   │ • AI Integration│   │    │                 │
│ └─────────────┘   └─────────────────┘   │    │                 │
└─────────────────────────────────────────┘    └─────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Database      │
              │   (PostgreSQL)  │
              │                 │
              │ • Users         │
              │ • Projects      │
              │ • Tasks         │
              │ • Resources     │
              └─────────────────┘
```

### 2. Database Schema

#### 2.1 Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2 Projects Table
```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.3 Tasks Table
```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_hours DECIMAL(5,2),
    priority INTEGER DEFAULT 50,
    status VARCHAR(50) DEFAULT 'pending',
    parent_task_id INTEGER REFERENCES tasks(id),
    assigned_to INTEGER REFERENCES resources(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.4 Resources Table
```sql
CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    weekly_hours INTEGER DEFAULT 40,
    skills TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. API Specifications (Next.js API Routes)

#### 3.1 Authentication Routes
```
pages/api/auth/register.ts      # POST - User registration
pages/api/auth/login.ts         # POST - User login
pages/api/auth/logout.ts        # POST - User logout
pages/api/auth/profile.ts       # GET - Get user profile
```

#### 3.2 Project Management Routes
```
pages/api/projects/index.ts     # GET/POST - List/Create projects
pages/api/projects/[id].ts      # GET/PUT/DELETE - Project CRUD
```

#### 3.3 AI Generation Routes
```
pages/api/projects/[id]/generate-tasks.ts    # POST - Generate tasks
pages/api/tasks/[id]/estimate.ts             # POST - Generate estimate
pages/api/projects/[id]/assign-resources.ts  # POST - Generate assignments
```

#### 3.4 Task Management Routes
```
pages/api/projects/[id]/tasks.ts    # GET/POST - List/Create tasks
pages/api/tasks/[id].ts             # GET/PUT/DELETE - Task CRUD
```

#### 3.5 Resource Management Routes
```
pages/api/resources/index.ts    # GET/POST - List/Create resources
pages/api/resources/[id].ts     # GET/PUT/DELETE - Resource CRUD
```

#### 3.6 Export Routes
```
pages/api/projects/[id]/export/csv.ts    # GET - Export to CSV
```

### 4. LLM Integration Design

#### 4.1 AI Service Interface
```javascript
class AIService {
    async generateTasks(projectDescription) {
        // Returns: Array of {title, description, estimatedHours, priority}
    }

    async estimateTask(taskDescription) {
        // Returns: {estimatedHours, confidence}
    }

    async assignTasks(tasks, resources) {
        // Returns: Array of {taskId, resourceId, reason}
    }
}
```

#### 4.2 Provider Implementations
- **OpenRouterService**: Uses OpenRouter API
- **GeminiService**: Uses Google Gemini API
- **Configuration**: Environment-based provider selection

#### 4.3 Prompt Templates
```javascript
const TASK_GENERATION_PROMPT = `
Break down this project into specific, actionable tasks:
Project: {projectDescription}

Return JSON array with:
- title: Clear, actionable task name
- description: 1-2 sentence explanation
- estimatedHours: Realistic time estimate
- priority: 1-100 (1=highest)

Focus on deliverable outcomes, not processes.
`;
```

### 5. Next.js Architecture

#### 5.1 Technology Stack
- **Framework**: Next.js 14 with TypeScript
- **State Management**: React Context + useReducer
- **Styling**: Tailwind CSS
- **Database ORM**: Prisma
- **Authentication**: NextAuth.js
- **Form Handling**: React Hook Form
- **Validation**: Zod

#### 5.2 Folder Structure
```
├── pages/
│   ├── _app.tsx                 # App wrapper
│   ├── index.tsx                # Landing page
│   ├── dashboard.tsx            # Main dashboard
│   ├── projects/
│   │   ├── index.tsx            # Projects list
│   │   └── [id].tsx             # Project detail
│   ├── resources/
│   │   └── index.tsx            # Resources management
│   └── api/                     # API routes
│       ├── auth/
│       ├── projects/
│       ├── tasks/
│       └── resources/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── projects/
│   │   ├── ProjectList.tsx
│   │   ├── ProjectForm.tsx
│   │   └── ProjectDetail.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskEditor.tsx
│   │   └── TaskAssignment.tsx
│   ├── resources/
│   │   ├── ResourceList.tsx
│   │   └── ResourceForm.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── lib/
│   ├── prisma.ts               # Database client
│   ├── auth.ts                 # Auth configuration
│   ├── ai/
│   │   ├── aiService.ts        # AI service abstraction
│   │   ├── openrouter.ts       # OpenRouter implementation
│   │   └── gemini.ts           # Gemini implementation
│   └── utils/
│       ├── validation.ts       # Zod schemas
│       └── helpers.ts          # Utility functions
├── hooks/
│   ├── useAuth.tsx
│   ├── useProjects.tsx
│   └── useAI.tsx
├── types/
│   ├── project.ts
│   ├── task.ts
│   └── resource.ts
└── prisma/
    ├── schema.prisma
    └── migrations/
```

### 6. Deployment Requirements

#### 6.1 Infrastructure
- **Full Stack**: Vercel (recommended for Next.js)
- **Database**: Vercel Postgres or Railway PostgreSQL
- **Environment**: Preview + Production branches

#### 6.2 Environment Variables
```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=...
OPENROUTER_API_KEY=...
GEMINI_API_KEY=...
NODE_ENV=production
```

#### 6.3 Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  }
}
```

### 7. Development Phases

#### Phase 1 (Weeks 1-2): Foundation
- Next.js project setup with TypeScript
- Prisma schema and database setup
- NextAuth.js authentication
- Basic page structure and routing

#### Phase 2 (Weeks 3-4): Core Features
- Project CRUD operations
- LLM service integration
- Task generation API routes
- Basic UI components

#### Phase 3 (Weeks 5-6): Advanced Features
- Resource management
- Task assignment algorithm
- Task editing and management
- Workload visualization

#### Phase 4 (Weeks 7-8): Polish & Launch
- CSV export functionality
- UI/UX improvements
- Error handling and validation
- User testing and feedback

### 8. Success Measurements

#### 8.1 Technical Metrics
- API response times < 3s
- 99% uptime
- Zero critical security vulnerabilities
- LLM success rate > 95%
- Core Web Vitals scores > 90

#### 8.2 User Experience Metrics
- Task generation accuracy (user ratings)
- Time saved vs manual planning
- User retention and engagement
- Feature usage analytics

### 9. Next.js Specific Benefits

#### 9.1 Development Advantages
- **Unified Codebase**: Frontend and backend in one repository
- **Built-in API Routes**: No separate backend deployment needed
- **TypeScript Support**: End-to-end type safety
- **File-based Routing**: Simplified page management
- **Built-in Optimization**: Image optimization, code splitting

#### 9.2 Performance Benefits
- **SSR/SSG**: Faster initial page loads
- **Edge Functions**: Global distribution
- **Automatic Code Splitting**: Optimal bundle sizes
- **Built-in Caching**: Improved performance

#### 9.3 Deployment Simplicity
- **Single Deployment**: One command deployment to Vercel
- **Automatic CI/CD**: Git-based deployments
- **Preview Deployments**: Branch-based previews
- **Zero Configuration**: Works out of the box

---

## Update Flow Design (MVP)

### 10. Project Update Workflow

#### 10.1 User Story
**As a** project manager
**I want to** update my project with new requirements or changes
**So that** my task list stays current without losing existing work

**Acceptance Criteria:**
- User can input project updates/changes
- System identifies potentially affected existing tasks
- User reviews and approves which tasks to modify
- AI suggests modifications with new estimates and priorities
- User can accept, reject, or edit suggested changes
- All changes are applied atomically (all or nothing)

#### 10.2 Update Flow Steps (Simple MVP Approach)

**Step 1: Change Input**
- User provides update description in a text field
- Examples: "Add mobile responsive design", "Client wants dark mode option", "Remove blog section"
- Max 2000 characters for MVP

**Step 2: Impact Analysis (Simple)**
- AI analyzes update text against existing task titles and descriptions
- Uses basic keyword matching + semantic similarity
- Flags tasks with >70% relevance score as "potentially affected"
- Returns list of potentially affected tasks with explanation

**Step 3: User Review - Task Selection**
- Show user all potentially affected tasks in a checklist
- User can:
  - ✓ Confirm tasks to modify
  - ✗ Skip tasks that shouldn't change
  - ➕ Add new tasks if needed
- Display current task details (title, description, hours, priority, status)

**Step 4: Handle In-Progress Tasks (Safety Check)**
- For tasks with status "in_progress":
  - Show warning: "This task is already in progress"
  - Ask: "Continue modifying this task? This may affect current work."
  - User must explicitly confirm each in-progress task

**Step 5: AI Modification Suggestions**
- For each selected task, AI suggests:
  - Updated title (if needed)
  - Updated description (if needed)
  - New estimated hours
  - New priority score (1-100)
  - Reason for changes
- Show side-by-side comparison: Original → Suggested

**Step 6: User Approval & Editing**
- User reviews each suggested modification
- Can accept, reject, or manually edit any field
- Must approve time estimates specifically
- Must approve priority changes specifically
- Can add additional tasks if AI missed something

**Step 7: Create New Tasks (If Needed)**
- If update requires completely new tasks, AI suggests them
- User reviews new task suggestions
- Same approval process as modifications

**Step 8: Final Review & Apply**
- Show summary of all changes:
  - X tasks to be modified
  - Y new tasks to be created
  - Z tasks unchanged
- User confirms final changes
- All changes applied atomically

#### 10.3 Technical Implementation

**Database Changes:**
```sql
-- Track update history
CREATE TABLE project_updates (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id),
    update_description TEXT NOT NULL,
    affected_tasks INTEGER[],
    created_tasks INTEGER[],
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**API Routes:**
```
pages/api/projects/[id]/updates/
├── analyze.ts          # POST - Analyze update impact
├── preview.ts          # POST - Generate modification preview
└── apply.ts            # POST - Apply approved changes
```

**Update Analysis Service:**
```typescript
interface UpdateAnalysisInput {
  projectId: string
  updateDescription: string
  existingTasks: Task[]
}

interface UpdateAnalysisResult {
  affectedTasks: {
    taskId: string
    relevanceScore: number
    reason: string
    currentStatus: string
  }[]
  suggestedNewTasks: {
    title: string
    description: string
    estimatedHours: number
    priority: number
  }[]
}

class UpdateAnalyzer {
  async analyzeUpdate(input: UpdateAnalysisInput): Promise<UpdateAnalysisResult>
  async generateModifications(taskIds: string[], updateContext: string): Promise<TaskModification[]>
}
```

**UI Flow Components:**
```
components/updates/
├── UpdateInputForm.tsx       # Step 1: Input change description
├── ImpactReview.tsx          # Step 3: Review affected tasks
├── InProgressWarning.tsx     # Step 4: Handle in-progress tasks
├── ModificationPreview.tsx   # Step 5-6: Review AI suggestions
├── NewTasksPreview.tsx       # Step 7: Review new tasks
└── UpdateSummary.tsx         # Step 8: Final confirmation
```

#### 10.4 Prompt Templates (Simple)

**Impact Analysis Prompt:**
```
Project Update: {updateDescription}

Existing Tasks:
{taskList}

Analyze which existing tasks might be affected by this update. Return JSON:
{
  "affectedTasks": [
    {
      "taskId": "task-123",
      "relevanceScore": 85,
      "reason": "This task handles user interface which needs mobile responsiveness"
    }
  ],
  "suggestedNewTasks": [
    {
      "title": "Mobile responsive design implementation",
      "description": "Make all UI components responsive for mobile devices",
      "estimatedHours": 16,
      "priority": 80
    }
  ]
}

Only flag tasks that are directly affected by the change. Be conservative.
```

**Task Modification Prompt:**
```
Update Context: {updateDescription}

Current Task:
Title: {currentTitle}
Description: {currentDescription}
Hours: {currentHours}
Priority: {currentPriority}

Suggest modifications needed for this update. Return JSON:
{
  "title": "updated title if needed",
  "description": "updated description if needed",
  "estimatedHours": new_estimate,
  "priority": new_priority,
  "reasoning": "why these changes are needed"
}

Only modify what's necessary. Keep changes minimal and focused.
```

#### 10.5 MVP Limitations & Future Enhancements

**MVP Limitations:**
- Simple keyword/semantic matching (no embeddings)
- Manual user approval for all changes
- No automatic priority recalculation across all tasks
- No dependency impact analysis
- No resource reallocation suggestions

**Future V2 Enhancements:**
- Advanced semantic similarity using embeddings
- Smart priority redistribution
- Dependency chain impact analysis
- Automatic resource rebalancing
- Change impact visualization
- Rollback capabilities
- Change history and diff views

#### 10.6 Success Metrics

**Technical Metrics:**
- Update analysis completes in <5 seconds
- >80% accuracy in identifying relevant tasks
- <10% false positive rate in task matching
- Zero data loss during update operations

**User Experience Metrics:**
- >70% user satisfaction with suggested modifications
- <5 minutes average time to complete update flow
- >90% of updates completed successfully
- <20% of updates requiring manual task creation

#### 10.7 Error Handling

**Update Flow Error States:**
- AI service timeout → Show manual editing options
- Invalid task modifications → Highlight issues, allow corrections
- Database transaction failure → Rollback, show error, retain user input
- Partial update failure → Show what succeeded/failed, allow retry

**User Guidance:**
- Progress indicators for each step
- Clear explanations of what each step does
- Undo/back buttons for each step
- Save draft capability for long update sessions
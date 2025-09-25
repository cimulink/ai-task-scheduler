# AI Task Scheduler MVP

An AI-powered tool that transforms project briefs into actionable task lists with smart resource assignments, built specifically for digital agencies.

## 🚀 Features

- **AI Task Generation**: Convert project descriptions into structured task lists
- **Smart Resource Assignment**: Automatic task assignment based on team member skills and availability
- **User Authentication**: Secure login and registration system
- **Project Management**: Create, edit, and manage multiple projects
- **Team Management**: Add and manage team members with roles and skills
- **Export Functionality**: Export schedules to CSV format for external tools

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **AI Integration**: OpenRouter & Google Gemini APIs

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn package manager

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd ai-task-scheduler
npm install
```

### 2. Database Setup (Docker)

Start the PostgreSQL 16 database using Docker Compose:

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify the database is running
docker-compose ps
```

### 3. Environment Setup

Copy the example environment file (already configured for Docker):

```bash
cp .env.example .env.local
```

The `.env.local` file is pre-configured for the Docker PostgreSQL setup:

```env
# Database (Docker setup)
DATABASE_URL="postgresql://ai_scheduler_user:ai_scheduler_password@localhost:5432/ai_task_scheduler"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# AI APIs (Optional for initial testing)
OPENROUTER_API_KEY=""
GEMINI_API_KEY=""
```

### 4. Initialize Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🗄️ Database Management

### Docker Commands

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Stop PostgreSQL container
docker-compose down

# View logs
docker-compose logs postgres

# Access PostgreSQL shell
docker-compose exec postgres psql -U ai_scheduler_user -d ai_task_scheduler

# Reset database (removes all data!)
docker-compose down -v
docker-compose up -d postgres
npx prisma db push
```

### Alternative Setup Options

#### Option 1: Local PostgreSQL Installation
1. Install PostgreSQL 16 on your system
2. Create database and user manually
3. Update `DATABASE_URL` in `.env.local`

#### Option 2: Cloud Database (For production)
Use services like:
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Railway PostgreSQL](https://railway.app/)
- [Supabase](https://supabase.com/)

## 📱 Usage

### Getting Started

1. **Sign Up**: Create a new account at `/auth/signup`
2. **Sign In**: Login at `/auth/signin`
3. **Dashboard**: Access your dashboard to see projects overview
4. **Create Project**: Click "New Project" to start your first project
5. **Add Team Members**: Go to "Manage Resources" to add your team

### Core Workflow

1. **Create Project**: Enter project title and description
2. **AI Task Generation**: Let AI break down your project into tasks
3. **Review & Edit**: Refine the generated tasks and estimates
4. **Add Resources**: Set up your team members with roles and skills
5. **Assign Tasks**: Get AI suggestions for task assignments
6. **Export**: Export your schedule to CSV for project management tools

## 🏗️ Project Structure

```
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── projects/       # Project-related components
│   ├── tasks/          # Task management components
│   ├── resources/      # Team management components
│   └── ui/             # Basic UI components
├── pages/              # Next.js pages
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   └── ...             # Other pages
├── lib/                # Utility functions and configurations
│   ├── ai/             # AI service implementations
│   ├── utils/          # Helper functions
│   ├── auth.ts         # NextAuth configuration
│   └── prisma.ts       # Database client
├── prisma/             # Database schema and migrations
├── styles/             # Global styles
└── types/              # TypeScript type definitions
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push

### Environment Variables for Production

```env
DATABASE_URL="your-production-database-url"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
OPENROUTER_API_KEY="your-openrouter-key"
GEMINI_API_KEY="your-gemini-key"
```

## 🔧 Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add some feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-username/ai-task-scheduler/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

## 🎯 MVP Scope

This is an MVP (Minimum Viable Product) focused on core functionality:

### ✅ Included
- User authentication and basic profiles
- Project creation and management
- AI-powered task generation
- Basic resource management
- Simple task assignment
- CSV export functionality

### 🔄 Future Enhancements (v2+)
- Real-time project management tool integrations
- Complex dependency management
- Multi-project scheduling
- Team collaboration features
- Mobile application
- Advanced reporting and analytics
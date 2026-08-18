# Tigray Resilient Referral Management System (TRMS)

TRMS is a comprehensive web-based application designed to manage and track patient referrals across health facilities in Tigray. It ensures secure, offline-capable, and role-based access to critical health referral workflows.

## Tech Stack

To ensure easy collaboration and avoid environment conflicts, all team members must use the following technologies:

### Frontend
1. Framework: [Next.js](https://nextjs.org/) (App Router)
2. Language: TypeScript
3. Offline Sync: PouchDB
4. Icons: Lucide React

### Backend
 1.Framework: [NestJS](https://nestjs.com/)
 2.Language: TypeScript
 3.Database ORM: [Prisma](https://www.prisma.io/)
 4.Database: PostgreSQL
 5.Security: JWT (Passport), bcrypt
 6.Notifications: Twilio SDK
##  Getting Started

Follow these steps to set up the development environment on your local machine.

### Prerequisites
1. Node.js: v24.x installed.
2. npm :node package managet v11.x
3. PostgreSQL: v14+ installed and running locally.
4. Git: Installed for version control.

### 1. Database Setup
Ensure your local PostgreSQL server is running. Create a database named trms.

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   bash
   cd backend
2. Install dependencies:
   bash
   npm install
3. Configure your environment variables:
4. Run database migrations to apply the schema:
   bash
   npx prisma migrate dev
5. Seed the database with initial roles and facilities:
   bash
   npx prisma db seed
   (If the seed script fails, ensure `ts-node` is installed and run `npx ts-node prisma/seed.ts`)
6. Start the backend server:
   bash
   npm run start:dev
   The API will run on `http://localhost:3001`
### 3. Clone Repository
bash
git clone https://github.com/organization/TRMS.git
cd TRMS
### 4. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   bash
   cd frontend
2. Install dependencies:
  bash
   npm install
3. Configure your environment variables:
   Create a `.env.local` file in the `frontend` directory:
    env
   NEXT_PUBLIC_API_URL="http://localhost:3001"
4. Start the frontend development server:
   bash
   npm run dev
   The UI will run on `http://localhost:3000`

##  Collaboration & Workflow (Trello + Git)

To keep development organized, we use Trello for task management and Git/GitHub for version control.

### Trello Board Workflow
Our Trello board is divided into the following columns:
1. Backlog: Future ideas and features.
2. To Do (Current Sprint): Tasks assigned for the current week.
3. In Progress: Tasks currently being worked on (Assign yourself to the card!).
4. Code Review / QA: Code pushed to a PR, waiting for team review.
5. Done: Merged into the main branch and fully tested.

### Git Branching Strategy
1. Never commit directly to the `main` branch.
2. When starting a task from Trello, create a new branch from `main`:
   bash
   git checkout main
   git pull origin main
   git checkout -b feature/trello-card-name
3. Commit your changes with clear, descriptive messages:
   bash
   git add .
   git commit -m "feat: Added notification inbox for nurses"
4. Push your branch to the remote repository:
   bash
   git push origin feature/trello-card-name
5. Open a Pull Request (PR) on GitHub/GitLab and link it to your Trello card.
6. Once a team member reviews and approves your PR, it can be merged into `main`.

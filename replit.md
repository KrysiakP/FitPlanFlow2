# Panel Trenera

## Overview
Panel Trenera is a professional web platform designed for trainers and their clients to manage training and nutrition plans. It enables trainers to create detailed training and diet plans, assign them to clients, and track their progress. The platform features a subscription-based model for trainers (SaaS), a transparent charity donation system ("PomagaMY"), and emphasizes its Polish origin.

**Key Capabilities:**
- User authentication with distinct roles (trainer/client).
- Comprehensive training plan management (create, edit, assign exercises, log performance).
- Detailed diet plan management (create, assign meals, track daily habits, monitor progress).
- Invitation system for trainers to connect with clients.
- Multi-tiered subscription system for trainers via Stripe.
- Publicly verifiable charity donation records.
- Fully localized Polish user interface.

## User Preferences
I prefer clear and concise communication.
I value an iterative development approach, with regular updates and opportunities for feedback.
Please prioritize security and data privacy in all implementations.
I prefer to be asked before any major architectural changes or significant feature additions are made.
I prefer detailed explanations for complex technical decisions.
Do not make changes to the folder `design_guidelines.md`.

## System Architecture
The application follows a client-server architecture with a React-based frontend and an Express.js backend.

**UI/UX Decisions:**
- **Design System:** Professional design system utilizing Inter (UI) and Poppins (headers) fonts, Tailwind CSS for styling, and shadcn/ui components.
- **Iconography:** Lucide React for consistent icons.
- **Language:** Entirely in Polish, including proper diacritics.
- **Theming:** Custom theme tokens integrated with shadcn/ui.

**Technical Implementations:**
- **Frontend:**
    - React SPA with Wouter for routing.
    - TanStack Query for state management and caching.
    - React Hook Form and Zod for form handling and validation.
- **Backend:**
    - Express.js API server.
    - Email/password authentication using bcryptjs for secure password hashing.
    - Express session management with PostgreSQL for persistent sessions.
    - Drizzle ORM for type-safe database interactions.
- **Database:** PostgreSQL (Neon) for robust and scalable data storage.

**Feature Specifications:**
- **Subscription System (6-tier):** Implemented with Stripe Checkout, Customer Portal, and Webhooks for automated subscription management (START, SOLO, PRO, ELITE, MAX, STUDIO tiers). Real-time enforcement of client limits per tier.
- **Invitation System:** Trainers send email invitations to clients, who can accept or reject them.
- **Exercise Logging:** Clients can log exercise performance (repetitions, weight) with automatic prefill from previous entries.
- **Diet Management:**
    - Trainers create diet plans with macronutrient targets and define meals.
    - Clients log daily habits including meals, water intake, and macronutrient consumption.
    - Progress tracking with charts and statistics for meal completion, streaks, and water intake.
- **"PomagaMY" Charity System:** Administrator uploads monthly charity donation confirmations, which are publicly displayed for transparency.
- **"Polska marka" Section:** Dedicated content highlighting the platform's local origin on the landing page and footer.

**System Design Choices:**
- **Data Model:** Comprehensive PostgreSQL schema including:
  - `users` (with roles and subscription data)
  - `sessions`, `trainingPlans`, `workouts`, `exercises`
  - `planAssignments`, `planInvitations`, `exerciseLogs`, `weeklyReports`
  - `charityDonations`
  - **Diet System Tables:**
    - `dietPlans` - Diet plans (trainerId, clientId, name, targetCalories/Protein/Fat/Carbs, mealsPerDay, status)
    - `dietMeals` - Meals in diet plans (planId, orderIndex, name, description) + unique(planId, orderIndex)
    - `dailyHabitLogs` - Daily habit logs (clientId, planId, date, waterLiters, hitCalories/Protein/Fat/Carbs) + unique(clientId, planId, date)
    - `mealCheckmarks` - Meal completion tracking (habitLogId, mealId, completed, completedAt) + unique(habitLogId, mealId)
- **API Endpoints:** Structured RESTful API covering:
  - Authentication (login, register, session management)
  - Trainer management (plans, clients, invitations)
  - Client actions (exercise logging, diet tracking)
  - Subscriptions (Stripe Checkout, Customer Portal, Webhooks)
  - **Diet Management:** 13 endpoints for plan CRUD, meal management, habit logging, and progress statistics
- **Authentication:** Session-based authentication with secure password handling.

## External Dependencies
- **Stripe:** For payment processing (Checkout, Customer Portal) and subscription management (Webhooks).
- **PostgreSQL (Neon):** Primary database solution.
- **bcryptjs:** Password hashing library.
- **Express-session & connect-pg-simple:** Session management.
- **Nodemailer:** (Implicit, for email invitations if not using an internal system)
- **Tailwind CSS:** Utility-first CSS framework.
- **shadcn/ui:** UI component library.
- **TanStack Query:** Data fetching and caching library.
- **React Hook Form & Zod:** Form management and validation.
- **Wouter:** React routing library.
- **Lucide React:** Icon library.
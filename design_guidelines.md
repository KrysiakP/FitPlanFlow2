# Design Guidelines - Platforma Trenerska

## Design Approach

**System-Based with Fitness Context**
Drawing from Material Design principles combined with modern fitness app aesthetics (Strava, MyFitnessPal dashboards). Focus on data clarity, efficient workflows, and professional credibility.

## Typography

**Font Families:**
- Primary: Inter (via Google Fonts) - UI elements, body text, data
- Accent: Poppins (via Google Fonts) - headings, emphasis

**Hierarchy:**
- H1: Poppins Bold, text-4xl (Dashboard titles)
- H2: Poppins SemiBold, text-2xl (Section headers)
- H3: Poppins Medium, text-xl (Card titles, plan names)
- Body: Inter Regular, text-base (Descriptions, form labels)
- Small: Inter Regular, text-sm (Metadata, helper text)
- Data: Inter Medium, text-lg (Sets, reps, numerical values)

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-6
- Section spacing: py-8 or py-12
- Card gaps: gap-4 or gap-6
- Form field spacing: space-y-4

**Grid Structure:**
- Desktop dashboards: 12-column grid with max-w-7xl container
- Card layouts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Sidebar + content: 64px fixed sidebar + flex-1 main content

## Component Library

### Navigation
**Top Navigation Bar:**
- Fixed header with app logo/title, user profile dropdown, logout button
- Height: h-16, shadow-sm for subtle elevation
- Responsive: hamburger menu on mobile

**Side Navigation (Coach Dashboard):**
- Fixed left sidebar: w-64 on desktop, collapsible on mobile
- Menu items: "Plany Treningowe", "Podopieczni", "Utwórz Plan", "Ustawienia"
- Active state: subtle background treatment with border-l-4 indicator

### Dashboard Components

**Stats Cards (Coach Overview):**
- Grid of 3-4 metric cards: total plans, active clients, pending assignments
- Each card: p-6, rounded-lg, shadow-sm
- Large number display with icon and label

**Training Plan Cards:**
- Elevated cards with rounded-lg corners
- Header: Plan name (H3) + metadata (date created, assigned count)
- Body: Exercise list preview (first 3-4 exercises)
- Footer: Action buttons (Edytuj, Usuń, Przypisz)
- Hover: subtle shadow elevation increase

**Client List Table:**
- Clean data table with alternating row treatment
- Columns: Imię, Email, Przypisany Plan, Status, Akcje
- Sortable headers, pagination at bottom
- Mobile: converts to stacked card layout

### Forms

**Registration/Login:**
- Centered form container: max-w-md
- Single column layout with generous spacing (space-y-6)
- Role selection: Large radio cards with icons (Podopieczny/Trener)
- Payment callout for trainer role: bordered notice with Stripe badge

**Training Plan Builder:**
- Two-column layout: form inputs (left) + live preview (right)
- Exercise entry: repeatable fieldset with Add/Remove buttons
- Fields per exercise: Nazwa, Serie, Powtórzenia, Opis, Odpoczynek
- Drag handles for reordering exercises

**Assignment Interface:**
- Modal overlay with client selection
- Searchable dropdown for client names
- Plan preview sidebar
- Confirm/Cancel actions

### Data Display

**Exercise List (Client View):**
- Accordion-style expandable sections per workout day
- Each exercise: card with clear label hierarchy
- Visual indicators: checkboxes for completion tracking
- Large, readable numbers for sets/reps

**Plan Details:**
- Header section: Plan name, description, trainer name
- Exercise breakdown: numbered list with card treatment
- Rest periods and notes: subtle typography with icon prefixes

### Buttons & Actions

**Primary Actions:** Medium size (px-6 py-3), rounded-lg, bold text
**Secondary Actions:** Outlined style, same sizing
**Icon Buttons:** Square (w-10 h-10), rounded-md, for quick actions
**Destructive Actions:** Separate visual treatment, confirmation required

### Overlays

**Modals:**
- Centered overlay with max-w-2xl width
- Backdrop blur effect
- Close button (top right)
- Padding: p-8

**Toast Notifications:**
- Fixed bottom-right position
- Auto-dismiss after 4 seconds
- Success/Error/Info variants with icons

## Icons

Use **Heroicons** (outline style) via CDN for consistency:
- Navigation: home, users, document-plus, cog
- Actions: pencil, trash, check, x-mark
- Status: check-circle, exclamation-circle
- Exercise types: dumbbell placeholder, clock for rest periods

## Authentication & Payment UI

**Stripe Integration:**
- Embedded Stripe Checkout for coach registration
- Payment status badge on profile
- Subscription management panel in coach settings

**Auth States:**
- Loading spinner during authentication
- Error messages: inline with form fields, red accent
- Success redirects to appropriate dashboard based on role

## Responsive Behavior

**Breakpoints:**
- Mobile (base): Single column, stacked cards, collapsible navigation
- Tablet (md: 768px): Two-column grids, visible sidebar
- Desktop (lg: 1024px): Full layout with three-column grids where appropriate

**Mobile Optimizations:**
- Bottom navigation bar for core actions
- Swipe gestures for card actions
- Full-screen modals instead of centered overlays
- Larger touch targets (min h-12 for buttons)

## Polish Language Specifics

All UI text in Polish with proper diacritics. Key terminology:
- Dashboard: "Panel"
- Workout Plan: "Plan Treningowy"
- Exercise: "Ćwiczenie"
- Sets/Reps: "Serie/Powtórzenia"
- Assign: "Przypisz"
- Client: "Podopieczny"
- Coach: "Trener"
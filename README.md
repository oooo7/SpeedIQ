# SpeedIQ

WhatsApp & Email Marketing platform built with Next.js (App Router), Supabase Auth, Tailwind CSS, and shadcn/ui.

## Features

- **Authentication**: Email/password and Google OAuth
- **Dashboard**: Sidebar navigation with collapsible menu
- **UI Components**: shadcn/ui component library
- **Theme Support**: Dark mode with system preference
- **Responsive Design**: Mobile-first layouts

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **UI**: shadcn/ui (Radix UI)
- **Auth**: Supabase Auth
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: Sonner

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file with your Supabase credentials (see `.env.example`).

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── app/
│   ├── auth/          # Auth pages
│   ├── dashboard/     # Dashboard
│   └── layout.tsx
├── components/
│   ├── auth/
│   ├── sidebar/
│   └── ui/
├── config/
├── lib/
├── hooks/
└── navigation/
```

## Scripts

- `npm run dev` – Development server
- `npm run build` – Production build
- `npm run start` – Production server
- `npm run lint` – ESLint

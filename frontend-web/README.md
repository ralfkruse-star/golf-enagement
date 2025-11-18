# Golf Engagement Admin Dashboard

React + Vite + Tailwind CSS Admin Dashboard für das Golf Engagement System.

## Features

- ✅ Dashboard mit Analytics
- ✅ Mitgliederverwaltung
- ✅ Event-Management
- ✅ Push-Notification-Composer
- ✅ Social Feed Management
- ✅ Segment-Management

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **API**: React Query + Axios
- **Routing**: React Router

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Development

```bash
# Dev server (http://localhost:5173)
pnpm dev

# Type checking
tsc --noEmit

# Lint
pnpm lint

# Format
pnpm format
```

## Login

Default Admin Account:
- Email: `admin@golfclub-siek.de`
- Password: `Admin123!`

## Project Structure

```
src/
├── components/      # Reusable UI components
├── pages/          # Page components
├── services/       # API services
├── store/          # Zustand stores
├── types/          # TypeScript types
├── utils/          # Utility functions
└── App.tsx         # Main app component
```

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Build

```bash
pnpm build
```

Output directory: `dist/`

## Pages

- `/` - Dashboard (Analytics Overview)
- `/members` - Member Management
- `/events` - Event Management
- `/notifications` - Push Notification Composer
- `/feed` - Social Feed Management
- `/segments` - Segment Management

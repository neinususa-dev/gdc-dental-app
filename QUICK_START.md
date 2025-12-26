# Quick Start Guide

## Prerequisites
- Node.js installed (v16 or higher)
- A Supabase account (neinususa@gmail.com)

## Quick Setup Steps

### 1. Create Supabase Project
- Go to https://app.supabase.com
- Sign in with neinususa@gmail.com
- Create a new project
- Get your credentials from Settings → API

### 2. Set Up Environment Variables

**Server** (`server/.env`):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:5173
PORT=5000
CORS_ORIGINS=http://localhost:5173
```

**Client** (`client/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database
- Open Supabase SQL Editor
- Copy and paste the SQL from `SUPABASE_SETUP.md` (Step 4)
- Run the script

### 4. Install and Run

**Terminal 1 - Server:**
```bash
cd server
npm install
npm start
```

**Terminal 2 - Client:**
```bash
cd client
npm install
npm run dev
```

### 5. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## First User Registration
1. Go to http://localhost:5173
2. Click "Register"
3. Fill in the registration form
4. You'll be automatically logged in

## Need More Details?
See `SUPABASE_SETUP.md` for comprehensive setup instructions.


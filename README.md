# GDC Dental Application

A comprehensive dental practice management application built with React and Node.js, powered by Supabase.

## Features

- **Patient Management**: Complete patient profiles with medical history tracking
- **Visit Records**: Detailed visit documentation with chief complaints, diagnosis, and treatment plans
- **Appointment Scheduling**: Manage appointments with status tracking and rescheduling
- **Medical History**: Comprehensive medical history forms with problem tracking
- **Analytics Dashboard**: View practice analytics and insights
- **Camp Submissions**: Manage dental camp submissions
- **Audit Logs**: Track all changes with detailed audit logs
- **Image Management**: Patient photo uploads via Supabase Storage or ImageKit

## Tech Stack

### Frontend
- React 19
- Vite
- React Router DOM
- Tailwind CSS
- Framer Motion
- Recharts (for analytics)
- Supabase JS Client

### Backend
- Node.js
- Express.js
- Supabase (PostgreSQL + Auth + Storage)
- ImageKit (optional, for image uploads)

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account (create one at [supabase.com](https://supabase.com))

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Dental
```

### 2. Set Up Supabase

Follow the detailed instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to:
- Create a Supabase project named `gdc-dental-app`
- Set up the database schema
- Configure storage buckets
- Get your API credentials

### 3. Configure Environment Variables

#### Server Configuration (`server/.env`)

Create a `.env` file in the `server` directory:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
FRONTEND_URL=http://localhost:5173
PORT=5000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: ImageKit Configuration
IK_PUBLIC_KEY=your-imagekit-public-key
IK_PRIVATE_KEY=your-imagekit-private-key
IK_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
```

#### Client Configuration (`client/.env`)

Create a `.env` file in the `client` directory:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Dependencies

#### Server

```bash
cd server
npm install
```

#### Client

```bash
cd client
npm install
```

### 5. Run the Application

#### Start the Server

```bash
cd server
npm start
# or for development with auto-reload:
npm run dev
```

The server will run on `http://localhost:5000`

#### Start the Client

```bash
cd client
npm run dev
```

The client will run on `http://localhost:5173`

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## First Time Setup

1. Open the application in your browser
2. Click "Register" to create your first user account
3. Fill in the registration form (username, email, phone, password)
4. You'll be automatically logged in after registration

## Project Structure

```
Dental/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── AuthPages/     # Authentication pages
│   │   ├── Page/          # Main pages
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/            # Configuration files
│   ├── controller/        # Route controllers
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   └── server.js          # Entry point
├── SUPABASE_SETUP.md      # Detailed Supabase setup guide
├── QUICK_START.md         # Quick start guide
└── README.md              # This file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Patients
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create new patient
- `PATCH /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Visits
- `GET /api/visits` - List visits
- `GET /api/visits/:id` - Get visit details
- `POST /api/visits` - Create new visit
- `PATCH /api/visits/:id` - Update visit
- `DELETE /api/visits/:id` - Delete visit

### Appointments
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PATCH /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Medical History
- `GET /api/medicalhistory/:patientId` - Get medical history
- `POST /api/medicalhistory/:patientId` - Create/update medical history

### Analytics
- `GET /api/analytics` - Get analytics data

### Audit Logs
- `GET /api/audit` - Get audit logs

### Camp Submissions
- `GET /api/camp-submissions` - List submissions
- `POST /api/camp-submissions` - Create submission
- `PATCH /api/camp-submissions/:id` - Update submission
- `DELETE /api/camp-submissions/:id` - Delete submission

## Database Schema

The application uses the following main tables:
- `users` - User accounts
- `patients` - Patient records
- `visits` - Visit records
- `medical_histories` - Medical history data
- `appointments` - Appointment scheduling
- `user_submissions` - Camp submissions
- `audit_event_log` - Audit trail

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for the complete database schema.

## Security

- Row Level Security (RLS) is enabled on all tables
- Authentication required for all API endpoints
- Service role key is only used server-side
- Environment variables are never committed to version control

## Development

### Running in Development Mode

Server with auto-reload:
```bash
cd server
npm run dev
```

Client with hot module replacement:
```bash
cd client
npm run dev
```

### Building for Production

#### Client
```bash
cd client
npm run build
```

The production build will be in `client/dist/`

## Troubleshooting

See the [Troubleshooting section](./SUPABASE_SETUP.md#troubleshooting) in SUPABASE_SETUP.md for common issues and solutions.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

## Support

For issues and questions:
- Check the [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) guide
- Review Supabase logs in your dashboard
- Check server and browser console logs

---

**Note**: Make sure to keep your `.env` files secure and never commit them to version control.


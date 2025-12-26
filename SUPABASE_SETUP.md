# Supabase Setup Guide for Dental Application

This guide will help you set up your own Supabase project for this dental application.

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in with your account: **neinususa@gmail.com**
3. Click **"New Project"**
4. Fill in the project details:
   - **Name**: `gdc-dental-app` (or any name you prefer)
   - **Database Password**: Create a strong password (save it securely!)
   - **Region**: Choose the region closest to you
   - **Pricing Plan**: Free tier is fine for development
5. Click **"Create new project"** and wait for it to be provisioned (2-3 minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon/public key**: Copy this (starts with `eyJ...`)
   - **service_role key**: Copy this (starts with `eyJ...`) - **⚠️ Keep this secret!**

## Step 3: Set Up Environment Variables

### Server Environment Variables

1. Navigate to the `server` folder
2. Create a `.env` file (copy from `.env.example` if it exists, or create new):

```bash
cd server
touch .env
```

3. Add the following to `server/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Frontend URL (for password reset redirects)
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=5000

# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ImageKit Configuration (optional - for image uploads)
# Get these from https://imagekit.io/dashboard
IK_PUBLIC_KEY=your-imagekit-public-key
IK_PRIVATE_KEY=your-imagekit-private-key
IK_URL_ENDPOINT=https://ik.imagekit.io/your-imagekit-id
```

**Replace the placeholder values with your actual Supabase credentials from Step 2.**

### Client Environment Variables

1. Navigate to the `client` folder
2. Create a `.env` file:

```bash
cd client
touch .env
```

3. Add the following to `client/.env`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace the placeholder values with your actual Supabase credentials from Step 2.**

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy and paste the following SQL script, then click **"Run"**:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing (if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'dentist',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PATIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dob DATE,
    gender TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    occupation TEXT,
    emergency_contact TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MEDICAL HISTORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.medical_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Tri-state fields (Yes/No/empty)
    surgery_or_hospitalized TEXT DEFAULT '',
    surgery_details TEXT,
    fever_cold_cough TEXT DEFAULT '',
    fever_details TEXT,
    abnormal_bleeding_history TEXT DEFAULT '',
    abnormal_bleeding_details TEXT,
    taking_medicine TEXT DEFAULT '',
    medicine_details TEXT,
    medication_allergy TEXT DEFAULT '',
    medication_allergy_details TEXT,
    
    -- Problem flags (boolean)
    artificial_valves_pacemaker BOOLEAN DEFAULT FALSE,
    asthma BOOLEAN DEFAULT FALSE,
    allergy BOOLEAN DEFAULT FALSE,
    bleeding_tendency BOOLEAN DEFAULT FALSE,
    epilepsy_seizure BOOLEAN DEFAULT FALSE,
    heart_disease BOOLEAN DEFAULT FALSE,
    hyp_hypertension BOOLEAN DEFAULT FALSE,
    hormone_disorder BOOLEAN DEFAULT FALSE,
    jaundice_liver BOOLEAN DEFAULT FALSE,
    stomach_ulcer BOOLEAN DEFAULT FALSE,
    low_high_pressure BOOLEAN DEFAULT FALSE,
    arthritis_joint BOOLEAN DEFAULT FALSE,
    kidney_problems BOOLEAN DEFAULT FALSE,
    thyroid_problems BOOLEAN DEFAULT FALSE,
    other_problem BOOLEAN DEFAULT FALSE,
    other_problem_text TEXT,
    
    past_dental_history TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(patient_id)
);

-- ============================================================================
-- VISITS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    chief_complaint TEXT,
    duration_onset TEXT,
    trigger_factors TEXT[],
    diagnosis_notes TEXT,
    treatment_plan_notes TEXT,
    findings JSONB,
    procedures JSONB,
    visit_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    service_type TEXT DEFAULT 'Checkup',
    status TEXT DEFAULT 'Pending',
    rescheduled_date DATE,
    rescheduled_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CAMP SUBMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    dob DATE,
    email TEXT,
    phone TEXT,
    comments TEXT,
    institution TEXT,
    institution_type TEXT DEFAULT 'Other',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_schema TEXT NOT NULL,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    old_row JSONB,
    new_row JSONB,
    changed_by UUID REFERENCES public.users(id),
    happened_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_event_log ENABLE ROW LEVEL SECURITY;

-- Users: Authenticated users can read all, update their own
CREATE POLICY "Users can read all" ON public.users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Patients: Authenticated users can read/write all
CREATE POLICY "Authenticated can read patients" ON public.patients
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert patients" ON public.patients
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update patients" ON public.patients
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete patients" ON public.patients
    FOR DELETE USING (auth.role() = 'authenticated');

-- Medical Histories: Authenticated users can read/write all
CREATE POLICY "Authenticated can read medical_histories" ON public.medical_histories
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert medical_histories" ON public.medical_histories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update medical_histories" ON public.medical_histories
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Visits: Authenticated users can read/write all
CREATE POLICY "Authenticated can read visits" ON public.visits
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert visits" ON public.visits
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update visits" ON public.visits
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete visits" ON public.visits
    FOR DELETE USING (auth.role() = 'authenticated');

-- Appointments: Authenticated users can read/write all
CREATE POLICY "Authenticated can read appointments" ON public.appointments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update appointments" ON public.appointments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete appointments" ON public.appointments
    FOR DELETE USING (auth.role() = 'authenticated');

-- User Submissions: Authenticated users can read/write all
CREATE POLICY "Authenticated can read user_submissions" ON public.user_submissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert user_submissions" ON public.user_submissions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update user_submissions" ON public.user_submissions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can delete user_submissions" ON public.user_submissions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Audit Log: Authenticated users can read all
CREATE POLICY "Authenticated can read audit_event_log" ON public.audit_event_log
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- STORAGE BUCKET FOR PATIENT PHOTOS
-- ============================================================================

-- Create storage bucket (run this in SQL Editor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for patient photos
CREATE POLICY "Authenticated can upload photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'patient-photos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated can read photos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'patient-photos' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated can delete own photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'patient-photos' AND
        auth.role() = 'authenticated'
    );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to create patient with initial medical history and visit (RPC)
CREATE OR REPLACE FUNCTION public.create_patient_with_initials(
    p_patient JSONB,
    p_medhist JSONB DEFAULT '{}'::JSONB,
    p_visit JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_patient_id UUID;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Insert patient
    INSERT INTO public.patients (
        created_by,
        first_name, last_name, dob, gender, phone, email,
        address_line1, address_line2, city, state, pincode,
        occupation, emergency_contact, photo_url
    )
    VALUES (
        v_user_id,
        (p_patient->>'first_name')::TEXT,
        (p_patient->>'last_name')::TEXT,
        (p_patient->>'dob')::DATE,
        (p_patient->>'gender')::TEXT,
        (p_patient->>'phone')::TEXT,
        (p_patient->>'email')::TEXT,
        (p_patient->>'address_line1')::TEXT,
        (p_patient->>'address_line2')::TEXT,
        (p_patient->>'city')::TEXT,
        (p_patient->>'state')::TEXT,
        (p_patient->>'pincode')::TEXT,
        (p_patient->>'occupation')::TEXT,
        (p_patient->>'emergency_contact')::TEXT,
        (p_patient->>'photo_url')::TEXT
    )
    RETURNING id INTO v_patient_id;

    -- Insert medical history if provided
    IF p_medhist IS NOT NULL AND p_medhist != '{}'::JSONB THEN
        INSERT INTO public.medical_histories (
            patient_id, created_by,
            surgery_or_hospitalized, surgery_details,
            fever_cold_cough, fever_details,
            abnormal_bleeding_history, abnormal_bleeding_details,
            taking_medicine, medicine_details,
            medication_allergy, medication_allergy_details,
            artificial_valves_pacemaker, asthma, allergy,
            bleeding_tendency, epilepsy_seizure, heart_disease,
            hyp_hypertension, hormone_disorder, jaundice_liver,
            stomach_ulcer, low_high_pressure, arthritis_joint,
            kidney_problems, thyroid_problems, other_problem,
            other_problem_text, past_dental_history
        )
        VALUES (
            v_patient_id, v_user_id,
            (p_medhist->>'surgery_or_hospitalized')::TEXT,
            (p_medhist->>'surgery_details')::TEXT,
            (p_medhist->>'fever_cold_cough')::TEXT,
            (p_medhist->>'fever_details')::TEXT,
            (p_medhist->>'abnormal_bleeding_history')::TEXT,
            (p_medhist->>'abnormal_bleeding_details')::TEXT,
            (p_medhist->>'taking_medicine')::TEXT,
            (p_medhist->>'medicine_details')::TEXT,
            (p_medhist->>'medication_allergy')::TEXT,
            (p_medhist->>'medication_allergy_details')::TEXT,
            COALESCE((p_medhist->>'artificial_valves_pacemaker')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'asthma')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'allergy')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'bleeding_tendency')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'epilepsy_seizure')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'heart_disease')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'hyp_hypertension')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'hormone_disorder')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'jaundice_liver')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'stomach_ulcer')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'low_high_pressure')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'arthritis_joint')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'kidney_problems')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'thyroid_problems')::BOOLEAN, FALSE),
            COALESCE((p_medhist->>'other_problem')::BOOLEAN, FALSE),
            (p_medhist->>'other_problem_text')::TEXT,
            (p_medhist->>'past_dental_history')::TEXT
        );
    END IF;

    -- Insert initial visit if provided
    IF p_visit IS NOT NULL AND p_visit != '{}'::JSONB THEN
        INSERT INTO public.visits (
            patient_id, created_by,
            chief_complaint, duration_onset, trigger_factors,
            diagnosis_notes, treatment_plan_notes,
            findings, procedures, visit_at
        )
        VALUES (
            v_patient_id, v_user_id,
            (p_visit->>'chief_complaint')::TEXT,
            (p_visit->>'duration_onset')::TEXT,
            ARRAY(SELECT jsonb_array_elements_text(p_visit->'trigger_factors')),
            (p_visit->>'diagnosis_notes')::TEXT,
            (p_visit->>'treatment_plan_notes')::TEXT,
            p_visit->'findings',
            p_visit->'procedures',
            (p_visit->>'visit_at')::TIMESTAMPTZ
        );
    END IF;

    -- Return the created patient
    SELECT row_to_json(p.*)::JSONB
    INTO v_result
    FROM public.patients p
    WHERE p.id = v_patient_id;

    RETURN v_result;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_histories_updated_at BEFORE UPDATE ON public.medical_histories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON public.visits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_submissions_updated_at BEFORE UPDATE ON public.user_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## Step 5: Create Storage Bucket (Alternative Method)

If the SQL method above doesn't work for storage, you can also create it via the Supabase dashboard:

1. Go to **Storage** in your Supabase dashboard
2. Click **"New bucket"**
3. Name it: `patient-photos`
4. Make it **Private** (not public)
5. Click **"Create bucket"**

## Step 6: Install Dependencies and Run

### Server Setup

```bash
cd server
npm install
npm start
# or for development with auto-reload:
npm run dev
```

### Client Setup

```bash
cd client
npm install
npm run dev
```

## Step 7: Test Your Setup

1. The server should start on `http://localhost:5000`
2. The client should start on `http://localhost:5173`
3. Try registering a new user through the application
4. Check your Supabase dashboard → **Authentication** → **Users** to see if the user was created

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Double-check that you copied the correct keys from Supabase Settings → API
   - Make sure there are no extra spaces in your `.env` files

2. **"Relation does not exist" error**
   - Make sure you ran the SQL schema script in Step 4
   - Check that all tables were created in Supabase → **Table Editor**

3. **"Permission denied" or RLS errors**
   - Verify that RLS policies were created correctly
   - Check that the user is authenticated (has a valid JWT token)

4. **Storage upload fails**
   - Verify the `patient-photos` bucket exists
   - Check storage policies are set correctly
   - Make sure you're using the service role key for server-side operations

5. **CORS errors**
   - Make sure `CORS_ORIGINS` in server `.env` includes your frontend URL
   - Default should be `http://localhost:5173`

## Next Steps

- Set up ImageKit (optional) for image uploads if you want to use it
- Configure email templates in Supabase for password resets (Settings → Auth → Email Templates)
- Set up any additional Supabase features you need (Edge Functions, Realtime, etc.)

## Support

If you encounter any issues, check:
- Supabase logs: Dashboard → Logs
- Server console output
- Browser console for client-side errors

---

**Note**: Keep your `.env` files secure and never commit them to version control. They should already be in `.gitignore`, but double-check to be safe.


# Implementation Plan: Multi-User Support Architecture

## 1. Overview & Objectives
Transition Plates from a single-tenant local storage app into a multi-user platform. The system should allow multiple lifters to use the app on the same device (e.g., shared home gym tablet or phone) or synchronize personal accounts across devices with cloud authentication.

---

## 2. Phased Architecture Strategy

### Phase 1: Local Multi-Profile Switcher (Zero-Backend / Fast MVP)
Allows multiple users on the same phone/tablet without requiring server infrastructure or login credentials.
- **Profile Registry**: Stored in `plates_profiles` (`[{ id: 'u_1', name: 'Mike', avatar: '...', active: true }, ...]`).
- **Namespaced Storage**: All user data keys isolated by profile ID:
  - `plates_${userId}_routines`
  - `plates_${userId}_history`
  - `plates_${userId}_shopping`
  - `plates_${userId}_active_session`
  - `plates_${userId}_theme`
- **Header Profile Avatar & Switcher Dropdown**: Allows instant 1-tap profile switching with PIN protection (optional).

### Phase 2: Cloud Authentication & Sync (Multi-Device Support)
Enables users to log in on any device (desktop, iPhone, tablet) and access their synchronized data.

#### Recommended Backend: **Supabase (PostgreSQL + RLS)**
- **Auth**: Supabase Auth (Email magic link, passwordless, or Google / Apple Sign-In).
- **Row Level Security (RLS)**: Enforces strict data isolation so users can never access another user's workout data.

#### Database Schema:
```sql
-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  weight_unit TEXT DEFAULT 'lbs',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Routines
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  exercises JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workout History Logs
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  routine_name TEXT NOT NULL,
  exercises JSONB NOT NULL,
  duration_seconds INT NOT NULL,
  total_volume INT NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT now()
);

-- Shopping List Items
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  checked BOOLEAN DEFAULT false,
  price NUMERIC(10,2) DEFAULT 0.00
);
```

#### Row Level Security Policies:
```sql
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only read and write their own routines"
  ON routines FOR ALL
  USING (auth.uid() = user_id);
```

---

## 3. UI / UX Design Additions

1. **Top Bar Profile Menu**:
   - Replaces or accompanies the theme toggle.
   - Shows current user initials or avatar.
   - Dropdown with:
     - "Switch Profile"
     - "Add New Profile"
     - "Export My Data (JSON)"
     - "Log In / Sync with Cloud"

2. **Auth & Profile Modal**:
   - Clean dark-mode dialog for creating a new lifter profile or signing in.
   - Smooth onboarding to choose preferred resting goals (Hypertrophy, Strength, Endurance).

---

## 4. Offline-First Sync Engine
Because gym basements often have zero cell signal:
- Always read and write immediately to local cache (`localStorage` or `IndexedDB`).
- Maintain a local sync queue (`plates_sync_queue`).
- Background Service Worker syncs pending workouts to Supabase once network connectivity resumes (`window.addEventListener('online', syncQueue)`).

---

## 5. Security & Privacy Considerations
- No personally identifiable health data exposed.
- Full client-side JSON export/import for GDPR data portability.
- Secure token storage using browser standard Web Crypto API / Supabase Session tokens.

---

## 6. Verification & Test Plan
- Switching profiles instantly swaps history and routines without state bleeding.
- Active workout on Profile A does not show in Profile B.
- Disconnecting WiFi during a workout preserves all logged sets locally without errors.
- Stress testing multi-profile storage limits within localStorage (5MB quota) and migration to IndexedDB if needed.

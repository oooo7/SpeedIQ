# Google Sign-In with Supabase

This app uses Supabase Auth with Google OAuth for "Login with Google". Follow these steps to enable it.

## 1. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Open **APIs & Services** → **Credentials**.
4. Click **Create Credentials** → **OAuth client ID**.
5. If prompted, configure the **OAuth consent screen** (External user type is fine; add your app name and support email).
6. Application type: **Web application**.
7. Add **Authorized redirect URIs** (exactly as shown in Supabase, see below):
   - For Supabase: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`
   - Find your project ref in Supabase: Project Settings → General → Reference ID.
8. Copy the **Client ID** and **Client Secret**.

## 2. Supabase Dashboard

1. Open [Supabase Dashboard](https://app.supabase.com) → your project.
2. Go to **Authentication** → **Providers**.
3. Enable **Google**.
4. Paste the **Client ID** and **Client Secret** from Google.
5. Save.

## 3. Redirect URLs in Supabase

Under **Authentication** → **URL Configuration** → **Redirect URLs**, add the URLs your app uses for the OAuth callback:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://your-domain.com/auth/callback`

Use your actual port if different (e.g. `3001`).

## 4. Flow in This App

- User clicks **Continue with Google** on `/auth/login` or `/auth/register`.
- They are sent to Google, then back to `/auth/callback?code=...`.
- The callback exchanges the code for a session and redirects to `/projects` (or the `next` / `redirect` path).
- No extra env vars are needed for Google; Supabase stores the provider config.

## Optional: Redirect after login

- Login page supports `?redirect=/some/path`. After Google sign-in, the user is sent to that path.
- Example: `/auth/login?redirect=/invite/abc123` sends the user to `/invite/abc123` after a successful Google login.

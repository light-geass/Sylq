# Firebase Auth Reference

This document collects the current Firebase authentication implementation and the files where Firebase auth is used in this project.

Use this as a restore point when changing auth providers or updating auth configuration.

## Current Firebase auth implementation

### 1. Frontend Firebase app config
- File: `frontend/app/firebase_SDK.js`
- Purpose: initializes Firebase app and exports `auth` for use across the frontend
- Current config values (now stored in `.env.local`):
  - `apiKey`: `process.env.NEXT_PUBLIC_FIREBASE_API_KEY`
  - `authDomain`: `process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `projectId`: `process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `storageBucket`: `process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `messagingSenderId`: `process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `appId`: `process.env.NEXT_PUBLIC_FIREBASE_APP_ID`
  - `measurementId`: `process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### 2. Firebase auth state management
- File: `frontend/context/AuthContext.js`
- Purpose: tracks auth state using `onAuthStateChanged(auth, ...)`, syncs token to API requests, and handles sign-out
- Notes:
  - Uses `auth` imported from `frontend/app/firebase_SDK.js`
  - Uses `setApiToken(token)` from `frontend/lib/api.js`

### 3. Login page auth flows
- File: `frontend/app/auth/login/[[...rest]]/page.jsx`
- Purpose: login via phone OTP and Google sign-in
- Firebase APIs used:
  - `RecaptchaVerifier`
  - `signInWithPhoneNumber(auth, mobileNumber, appVerifier)`
  - `GoogleAuthProvider`
  - `signInWithPopup(auth, provider)`

### 4. Signup page auth flows
- File: `frontend/app/auth/signup/[[...rest]]/page.jsx`
- Purpose: user registration with phone OTP or Google sign-up
- Firebase APIs used:
  - `RecaptchaVerifier`
  - `signInWithPhoneNumber(auth, mobileNumber, appVerifier)`
  - `GoogleAuthProvider`
  - `signInWithPopup(auth, provider)`
  - `updateProfile(user, { displayName })`

### 5. Firebase Admin / backend service credential file
- File: `backend/firebase-service-account.json`
- Purpose: Firebase service account credentials for backend admin or server-side Firebase tasks
- Notes: this file contains service account fields such as `client_email`, `private_key`, and `project_id`

## Other auth-related files in use
- `frontend/lib/api.js`
  - Receives the Firebase JWT token from `AuthContext.js` and attaches it to backend API requests
- `frontend/components/TopBar.jsx`
  - Reads auth state with `useAuth()` and shows logout links
- `frontend/components/Navbar.jsx`
  - Reads auth state with `useAuth()` for UI changes based on login state
- `frontend/package.json`
  - Firebase dependency: `firebase@^12.13.0`

## Notes for rollback / auth change
- Before changing auth:
  1. Copy `frontend/app/firebase_SDK.js` and `frontend/context/AuthContext.js` to a backup location.
  2. Keep `backend/firebase-service-account.json` safe if the backend still relies on Firebase credentials.
  3. Keep this document updated with the new auth provider and file references.

- If the new auth setup fails, restore these files and re-run the app to recover the original Firebase auth flow.

## Recommended backup strategy
- Keep a copy of this markdown file in the repository root.
- Save old auth-related files with a clear suffix, e.g. `firebase_SDK.old.js` or `AuthContext.old.js`.
- Optionally preserve the old `firebase-service-account.json` contents in a separate secure backup file if you remove it from the repo.

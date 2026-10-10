# UNSAID — Anonymous Freedom Wall for Baguio City

UNSAID is a privacy-first, ultra-minimalist anonymous platform where students and residents of Baguio can post thoughts, confessions, rants, and experiences without creating an account or revealing their identity.

## Tech Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend/Database:** Firebase Firestore, App Check, Next.js API Routes

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Environment Variables:**
   Copy `.env.example` to `.env.local` and populate Firebase credentials.

3. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Deploy Firestore Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

## TambayanSLU Team Portal

The private portal is available at `/team`. Team accounts use Firebase Email/Password Authentication and a revocable server session cookie. Public registration is intentionally unavailable.

Bootstrap the first Founder manually in Firebase Authentication and create a matching `teamMembers/{uid}` document before using the portal. The stored role value remains `owner` for authorization compatibility, but the portal displays it as Founder:

```text
uid: string (same as the Firebase Auth UID)
displayName: string
email: string
role: "owner"
status: "active"
verified: true
createdAt: Firestore timestamp
activity: {
  reviewedPosts: 0,
  approvedPosts: 0,
  rejectedPosts: 0,
  reportsResolved: 0
}
```

Create the matching display-only `teamPublicProfiles/{uid}` document with `displayName`, `role: "owner"`, and `verified: true`. After bootstrap, the Founder can create Admin, Moderator, and Marketing accounts from `/team/members`. Do not place email addresses or private account metadata in `teamPublicProfiles`.

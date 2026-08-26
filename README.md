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

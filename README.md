## Beauty of Bronze Website

Tech: Vite + React + TypeScript, Tailwind v4, React Router, Vercel.

Scripts:

- `npm run dev`: start dev server
- `npm run build`: build for production
- `npm run preview`: preview production build

Tailwind v4: styles are in `src/index.css` using `@import "tailwindcss"` and `@theme`.

Routing: see `src/main.tsx` and `src/pages/HomePage.tsx`.

Vercel: SPA rewrite via `public/vercel.json`.

Environment variables (for future Firebase):

- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

Deployment:

1. Push to GitHub
2. Import to Vercel → Framework: Vite, Root: `/`
3. Set env vars as needed

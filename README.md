# WAVR

Battle your friends (or randoms) to pick the best song for a prompt — text or photo.

## Local dev
npm install
npm run dev

## Build
npm run build
# outputs to dist/

## Deploy
Push this folder to a GitHub repo, then import it on vercel.com — it auto-detects Vite and deploys.
Or drag the dist/ folder onto https://app.netlify.com/drop for an instant one-off deploy.

## Backend
Uses Supabase (see schema.sql). SUPABASE_URL and SUPABASE_ANON_KEY are set directly in src/App.jsx.

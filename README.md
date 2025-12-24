## Setup (local)
- Install: `npm install`
- Copy `env.example` → `.env.local` and fill values.
- Run dev: `npm run dev` (http://localhost:3000)
- Build test: `npm run build` then `npm start`

## Environment variables
See `env.example` for the full list. Key values:
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `MONGO_URL`
- `SECRET_KEY_ACCESS_TOKEN`, `SECRET_KEY_REFRESH_TOKEN`, `JWT_SECRET`
- `NEXT_PUBLIC_BASE_ALPHA`
- `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE`
- `AWS_S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
- `AUTH_TRUST_HOST=true` on Vercel

## Google OAuth (fix redirect_uri_mismatch)
1) In Google Cloud Console → OAuth consent screen: add your domain to "Authorized domains".  
2) OAuth Client → "Authorized redirect URIs":  
   - `http://localhost:3000/api/auth/callback/google` (local)  
   - `https://<your-vercel-domain>/api/auth/callback/google`  
   - `https://www.alphaartandevents.com/api/auth/callback/google` (custom domain)  
3) Add env values to Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL=https://<your-domain>`, `NEXTAUTH_SECRET`.  
4) Redeploy and verify login at `/auth/sign-in` (Google button).

## Vercel deployment checklist
- Connect repo and set all envs from `.env.local` in Vercel → Project Settings → Environment Variables (include production + preview).  
- `NEXTAUTH_URL` must match the deployed domain; keep `AUTH_TRUST_HOST=true`.  
- Ensure MongoDB Atlas IP allow-list includes Vercel IPs or use "Allow Access from Anywhere".  
- Build command: `npm run build`; Output: Next.js (defaults are fine).  
- After deploy, validate Google login and protected routes.

## Folder hints
`src/app/api/auth/[...nextauth]/route.ts` → NextAuth handler  
`src/lib/auth.ts` → provider/callback setup  
`src/services/api_endpoints.ts` → API base URL (`NEXT_PUBLIC_BASE_ALPHA`)  
`src/lib/db.ts` → Mongo connection  
`src/app/api/*` → backend routes (S3, auth, cart, orders, admin, etc.)

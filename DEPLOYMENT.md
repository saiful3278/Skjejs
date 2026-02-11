# Deploying the E-commerce Static Site

## Option 1: Netlify (drag-and-drop)
- Create an account and new site.
- Drag the project folder to deploy (publish directory is the project root).
- No build command required.
- Environment: the anon key is safe client-side; keep env.js updated.

## Option 2: Vercel
- Import the repository in Vercel.
- Framework preset: Other.
- Build Command: none.
- Output Directory: .
- vercel.json sets security and caching headers.

## Option 3: GitHub Pages
- Push the project to a repo.
- Settings → Pages → Deploy from root.
- Ensure index.html is in the root.

## Option 4: Cloudflare Pages
- Create a Pages project from your repo.
- Build command: none.
- Output directory: .

## Supabase Access
- Uses env.js with SUPABASE_URL and SUPABASE_ANON_KEY.
- Only anon key is used and safe for public clients with RLS.

## Post-deploy Checklist
- Test product listing and detail pages.
- Test cart add/remove/quantity and checkout.
- Verify images load from Supabase Storage.
- Confirm security headers via browser devtools.

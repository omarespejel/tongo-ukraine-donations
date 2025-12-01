# 🚀 Cloudflare Pages Deployment Guide

## 📇 On-chain Deployment Records

- Canonical addresses are tracked under `deployments/<network>.json`.
- Latest Sepolia deployment lives in `deployments/sepolia.json` with class hashes, tx hashes, and artifact paths.
- Update the JSON **every time you declare or deploy** so the frontend/backends can pull the newest addresses.

---

## ⚠️ First Time Setup

### Step 1: Login to Cloudflare

You need to authenticate with Cloudflare first:

```bash
# Run this command to login
npx wrangler login

# Or use the npm script
bun run deploy:login
```

This will:
1. Open your browser
2. Ask you to login to Cloudflare
3. Authorize Wrangler
4. Save credentials locally

**After login, you can deploy!**

---

## Quick Deploy (CLI) ⚡

### Option 1: Use npm script (recommended)

```bash
# Build and deploy in one command
bun run deploy
```

### Option 2: Manual steps

```bash
# Step 1: Build
bun run build:deploy

# Step 2: Deploy
npx wrangler pages deploy dist --project-name=tongo-ukraine
```

**First time?** It will ask:
- `? Do you want to create a new project?` → **Yes**
- `? Enter the production branch name:` → **main**

### Step 3: Get Your URL

```
✨ Deployment complete!
🌐 https://tongo-ukraine.pages.dev
```

**Done!** Your app is live! 🎉

---

## Git Integration (Auto-Deploy) 🔄

### Step 1: Push to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: Tongo Ukraine Donations"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/tongo-ukraine-donations.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Workers & Pages** in sidebar
3. Click **Create application**
4. Select **Pages** tab
5. Click **Connect to Git**

### Step 3: Configure Build Settings

| Setting | Value |
|---------|-------|
| **Framework preset** | `None` |
| **Build command** | `bun run build:deploy` |
| **Build output directory** | `dist` |
| **Root directory** | `/` (leave empty) |

### Step 4: Deploy

Click **Save and Deploy** → Wait 1-2 minutes ⏳

**Your URL:** `https://tongo-ukraine.pages.dev`

---

## 📋 Quick Reference Commands

```bash
# Login to Cloudflare (first time only)
bun run deploy:login
# or
npx wrangler login

# Build only
bun run build:deploy

# Deploy (after login)
bun run deploy
# or
npx wrangler pages deploy dist --project-name=tongo-ukraine

# List projects
npx wrangler pages project list

# List deployments
npx wrangler pages deployment list tongo-ukraine

# Tail logs
npx wrangler pages deployment tail tongo-ukraine
```

---

## 🔧 Troubleshooting

### "command not found: wrangler"

✅ **Fixed!** The deploy script now uses `npx wrangler` automatically.

### "CLOUDFLARE_API_TOKEN environment variable"

You need to login first:

```bash
npx wrangler login
```

Or set an API token:

```bash
# Get token from: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
export CLOUDFLARE_API_TOKEN=your_token_here
bun run deploy
```

### Build fails?

```bash
# Check locally first
bun run build:deploy
bun run preview
# Open http://localhost:4173
```

### Node.js version warning

The warning about Node.js 21.7.3 is just informational. Vite 7.2.4 works with Node 20.19+ or 22.12+, but your version (21.7.3) should still work. If you encounter issues, consider upgrading to Node 22.

---

## ✅ Post-Deploy Checklist

After deployment, verify:

- [ ] Site loads at `https://tongo-ukraine.pages.dev`
- [ ] Wallet connection works (Braavos/Argent X)
- [ ] Network switching works (Mainnet/Sepolia)
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Lightning section displays (when wallet connected)

---

## 🌐 Add Custom Domain (Optional)

1. Go to Dashboard → Workers & Pages → Your Project → **Custom domains**
2. Add your domain (e.g., `donate-ukraine.org`)
3. Update DNS with the CNAME record Cloudflare provides
4. SSL is automatic! ✅

---

## 🚀 Deploy Now!

**First time?** Run login first:

```bash
# Step 1: Login
bun run deploy:login

# Step 2: Deploy
bun run deploy
```

**Already logged in?**

```bash
# One command to build and deploy
bun run deploy
```

**Expected output:**

```
✓ built in 2.72s
📦 Uploading... (12 files)
✅ Deployment complete!

🌐 Live at: https://tongo-ukraine.pages.dev
```

---

## 🔄 Automatic Deploys (CI/CD)

Once connected to GitHub, every push to `main` auto-deploys:

```bash
# Make changes
git add .
git commit -m "feat: add Lightning donations"
git push

# Cloudflare automatically:
# 1. Detects push
# 2. Runs: bun run build:deploy
# 3. Deploys to: tongo-ukraine.pages.dev
# 4. ~60 seconds total
```

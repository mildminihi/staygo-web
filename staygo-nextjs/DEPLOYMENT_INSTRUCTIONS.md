# 🚀 Deployment Instructions

## 📋 Pre-deployment Checklist

Before deploying, make sure:
- ✅ Code builds successfully (`npm run build`)
- ✅ All pages load correctly in local preview
- ✅ CNAME file contains correct domain
- ✅ DNS records are configured

## 🔧 Initial Setup

### 1. GitHub Repository Setup

```bash
# In staygo-nextjs directory
git init
git add .
git commit -m "Initial Next.js migration"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/staygo-web.git
git push -u origin main
```

### 2. GitHub Pages Configuration

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Source**: `GitHub Actions`
4. The workflow will auto-deploy on push to `main`

### 3. Custom Domain Setup

#### DNS Configuration (at your domain provider)

Add these DNS records for `staygoch.com`:

```
Type    Name    Value
----    ----    -----
A       @       185.199.108.153
A       @       185.199.109.153
A       @       185.199.110.153
A       @       185.199.111.153
CNAME   www     YOUR_USERNAME.github.io
```

#### GitHub Pages Custom Domain

1. Go to **Settings** → **Pages**
2. Under **Custom domain**, enter: `staygoch.com`
3. Click **Save**
4. Wait for DNS check (may take a few minutes)
5. Enable **Enforce HTTPS** once DNS propagates

## 🔄 Deployment Methods

### Method 1: Automatic Deploy with GitHub Actions (Recommended)

The project includes a GitHub Actions workflow that automatically deploys on push:

```bash
# Just push to main branch
git add .
git commit -m "Your changes"
git push origin main
```

The workflow will:
1. Install dependencies
2. Build the project
3. Deploy to GitHub Pages
4. Your site will be live at `https://staygoch.com`

### Method 2: Manual Deploy

If you prefer manual deployment:

```bash
# 1. Build the project
npm run build

# 2. Navigate to build output
cd out

# 3. Initialize git in out directory
git init
git add -A
git commit -m 'Deploy'

# 4. Force push to gh-pages branch
git push -f git@github.com:YOUR_USERNAME/staygo-web.git main:gh-pages

# 5. Go back to project root
cd ..
```

### Method 3: Deploy to Vercel (Alternative)

If you want zero-config deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts and link to your Vercel account
```

Vercel will:
- Auto-detect Next.js
- Configure build settings
- Provide a production URL
- Set up custom domain (if configured)

## 🔍 Verifying Deployment

### Check Build Status

1. **GitHub Actions**: 
   - Go to **Actions** tab in your repository
   - Check the latest workflow run
   - Should show green checkmark ✅

2. **GitHub Pages**:
   - Go to **Settings** → **Pages**
   - Should show: "Your site is live at https://staygoch.com"

### Test Deployed Site

Visit these URLs to verify:

- ✅ Homepage: `https://staygoch.com/`
- ✅ About: `https://staygoch.com/about/`
- ✅ Games Index: `https://staygoch.com/games/`
- ✅ Reveal Board: `https://staygoch.com/games/reveal-board/`
- ✅ Tools: `https://staygoch.com/tools/dice/`, etc.

### Check SEO

Test with these tools:
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)

## 🐛 Troubleshooting

### Issue: Build Fails

**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules .next out
npm install
npm run build
```

### Issue: 404 on Routes

**Possible causes:**
1. Static export doesn't support dynamic routes
2. Missing index.html files

**Solution:**
- Ensure all routes have `page.tsx` files
- Check `out/` directory structure after build

### Issue: Custom Domain Not Working

**Solutions:**

1. **Wait for DNS propagation** (can take up to 48 hours)
   ```bash
   # Check DNS propagation
   dig staygoch.com
   ```

2. **Verify CNAME file**
   ```bash
   # Check if CNAME exists in out/
   cat out/CNAME
   # Should output: staygoch.com
   ```

3. **Check GitHub Pages settings**
   - Make sure custom domain is saved
   - HTTPS might take time to provision

### Issue: Styles Not Loading

**Solution:**
```bash
# Make sure globals.css is imported in layout.tsx
# Verify build output includes CSS files
ls -la out/_next/static/chunks/*.css
```

### Issue: Images Not Found

**Solution:**
- Images must be in `public/` folder
- Reference without `/public` prefix: `/assets/image/logo.png`
- Verify images copied to `out/` after build

## 📊 Post-Deployment Tasks

### 1. Submit Sitemap to Google

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `staygoch.com`
3. Submit sitemap: `https://staygoch.com/sitemap.xml`

### 2. Set Up Analytics (Optional)

Add Google Analytics:
```tsx
// src/app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_MEASUREMENT_ID');
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Monitor Performance

Use these tools:
- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics](https://analytics.google.com/)
- [Vercel Analytics](https://vercel.com/analytics) (if using Vercel)

## 🔄 Continuous Deployment

### Updating Content

1. Make changes locally
2. Test with `npm run dev`
3. Commit and push:
   ```bash
   git add .
   git commit -m "Update content"
   git push origin main
   ```
4. GitHub Actions will auto-deploy

### Adding New Pages

```bash
# Create new page
mkdir src/app/new-page
touch src/app/new-page/page.tsx

# Add content, commit, push
git add .
git commit -m "Add new page"
git push origin main
```

### Rollback if Needed

```bash
# Find previous commit
git log

# Reset to previous commit
git reset --hard COMMIT_HASH

# Force push
git push -f origin main
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub Pages Documentation](https://docs.github.com/pages)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Vercel Documentation](https://vercel.com/docs)

## 🎉 Deployment Complete!

Your site should now be live at **https://staygoch.com** 🚀

If you encounter any issues, refer to this guide or check the [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for more details.

---

**Happy deploying!** 🎊


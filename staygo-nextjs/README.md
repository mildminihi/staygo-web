# STAYGO Website - Next.js Version

เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYGO

🌐 **Live Site**: [https://staygoch.com](https://staygoch.com)

## 🚀 เทคโนโลยีที่ใช้

- **Next.js 16** - React Framework พร้อม App Router
- **TypeScript** - Type-safe JavaScript
- **Static Export** - สำหรับ deploy บน GitHub Pages
- **CSS Custom Properties** - Global styling

## 📁 โครงสร้างโปรเจค

```
staygo-nextjs/
├── src/
│   ├── app/              # App Router pages
│   │   ├── layout.tsx    # Root layout with Header & Footer
│   │   ├── page.tsx      # Home page
│   │   ├── about/        # About page
│   │   ├── games/        # Games listing page
│   │   └── tools/        # Tools (using static HTML from public)
│   └── components/       # Reusable React components
│       ├── Header.tsx
│       └── Footer.tsx
├── public/               # Static assets
│   ├── assets/          # Images, CSS, JS
│   ├── games/           # Game HTML files (served statically)
│   ├── tools/           # Tool HTML files (served statically)
│   ├── CNAME            # Custom domain config
│   └── .nojekyll        # GitHub Pages config
└── next.config.ts       # Next.js configuration

```

## 🛠️ การพัฒนา (Development)

### Prerequisites

- Node.js 20+ และ npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

## 📦 Build และ Deployment

### Build สำหรับ Production

```bash
# Build static export
npm run build
```

ไฟล์ที่ build เสร็จจะอยู่ใน folder `out/`

### Deploy to GitHub Pages

1. **Build project:**
   ```bash
   npm run build
   ```

2. **Push to gh-pages branch:**
   ```bash
   # จาก root ของ repo
   cd out
   git init
   git add -A
   git commit -m 'Deploy'
   git push -f git@github.com:YOUR_USERNAME/YOUR_REPO.git main:gh-pages
   ```

3. **GitHub Pages Settings:**
   - ไปที่ Repository Settings > Pages
   - เลือก Source: Deploy from a branch
   - เลือก Branch: `gh-pages` และ folder `/` (root)
   - Save

4. **Custom Domain (staygoch.com):**
   - ไฟล์ `CNAME` ใน `public/` จะถูก copy ไปที่ `out/` automatically
   - ตั้งค่า DNS records:
     ```
     A Record: @ → 185.199.108.153
     A Record: @ → 185.199.109.153
     A Record: @ → 185.199.110.153
     A Record: @ → 185.199.111.153
     CNAME: www → YOUR_USERNAME.github.io
     ```

## 🎮 เกมและเครื่องมือ

### เกม
- **เปิดแผ่นป้ายทายภาพ** (`/games/reveal-board`) - เกมปาร์ตี้ทายภาพ
- **ลูปนรกหมกมุ่น** (`/games/cardloop`) - เกมไพ่ท้าทาย
- **จับคู่อีโมจิ** (`/games/emoji-match`) - เกมจำและจับคู่

### เครื่องมือ
- **ทอยลูกเต๋า** (`/tools/dice`) 
- **จับเวลา** (`/tools/timer`)
- **สุ่มทีม** (`/tools/team-randomizer`)
- **ตารางคะแนน** (`/tools/scoreboard`)
- **จัดสายการแข่งขัน** (`/tools/tournament-bracket`)
- **จับเวลาสำหรับแข่ง** (`/tools/competition-timer`)
- **จับสลาก** (`/tools/lucky-draw`)
- **Host Tools** (`/tools/host-tools`)

## 🏗️ Migration Notes

### Hybrid Architecture

โปรเจคนี้ใช้ **Hybrid Architecture**:
- **Next.js Pages**: หน้าหลัก, About, Games Index - ใช้ React components พร้อม SSG
- **Static HTML**: เกมและเครื่องมือที่มี JavaScript logic ซับซ้อน - serve จาก `public/` folder

### ทำไมถึงใช้ Hybrid?

1. **Preserve Functionality**: เกม/เครื่องมือมี JavaScript logic ที่ซับซ้อนและทำงานได้ดีแล้ว
2. **Fast Migration**: แปลงส่วนหลักเป็น React ได้เร็ว โดยไม่ต้อง rewrite ทั้งหมด
3. **Future Ready**: สามารถ migrate เกม/เครื่องมือเป็น React components ทีละตัวได้ในอนาคต

## 🔍 SEO Configuration

- ✅ Meta tags (title, description, keywords)
- ✅ Open Graph tags
- ✅ Twitter Card tags
- ✅ Canonical URLs
- ✅ robots.txt (generated by Next.js)
- ✅ sitemap.xml (ใช้ `next-sitemap` package ถ้าต้องการ auto-generate)

## 🚧 Future Improvements

- [ ] Migrate games to React components with proper state management
- [ ] Add API routes for dynamic features
- [ ] Implement Server Components where applicable
- [ ] Add analytics tracking
- [ ] Optimize images with next/image
- [ ] Add PWA support
- [ ] Implement i18n for multiple languages

## 📝 License

© STAYGO 2025

## 🤝 Contributing

ติดต่อทีมงาน STAYGO ผ่านช่องทาง:
- YouTube: [@STAYGO](https://www.youtube.com/@STAYGO)
- Facebook: [STAYGO](https://facebook.com/STAYGO)
- Instagram: [@staygo.official](https://instagram.com/staygo.official)

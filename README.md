# STAYGO Website

เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYGO

🌐 **Live Site**: [https://staygoch.com](https://staygoch.com)

## 📁 โครงสร้างโปรเจค

```
staygo-web/
├── staygo-nextjs/          # 🚀 โปรเจค Next.js (ใช้อันนี้)
│   ├── src/                # React components & pages
│   ├── public/             # Static assets
│   └── out/                # Build output (สำหรับ deploy)
│
├── _old-html/              # 📦 Backup ของเว็บไซต์ HTML เดิม
│   ├── index.html
│   ├── games/
│   ├── tools/
│   └── assets/
│
└── *.md                    # 📖 เอกสารต่างๆ
```

## 🚀 Quick Start

### ติดตั้งและรัน

```bash
# เข้าไปที่โปรเจค Next.js
cd staygo-nextjs

# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

### Build สำหรับ Production

```bash
cd staygo-nextjs
npm run build
```

ไฟล์ที่ build เสร็จจะอยู่ใน `staygo-nextjs/out/`

## 📚 เอกสารเพิ่มเติม

- **[Next.js README](./staygo-nextjs/README.md)** - คู่มือโปรเจค Next.js
- **[Migration Guide](./staygo-nextjs/MIGRATION_GUIDE.md)** - รายละเอียดการ migrate จาก HTML → Next.js
- **[Deployment Instructions](./staygo-nextjs/DEPLOYMENT_INSTRUCTIONS.md)** - วิธีการ deploy
- **[DNS Setup](./DNS-SETUP.md)** - คำแนะนำตั้งค่า DNS

## 🔄 การ Migrate

โปรเจคนี้ได้ทำการ migrate จาก static HTML ไปเป็น Next.js แล้ว:

### ก่อน (HTML)
- Static HTML files
- No framework
- Manual deployment

### หลัง (Next.js) ✅
- React components
- TypeScript
- Modern development workflow
- Optimized build & SEO
- GitHub Actions auto-deploy

ไฟล์ HTML เดิมถูกย้ายไปยัง `_old-html/` เป็น backup แล้ว

## 🎮 เกมและเครื่องมือ

### เกม
- เปิดแผ่นป้ายทายภาพ
- ลูปนรกหมกมุ่น
- จับคู่อีโมจิ

### เครื่องมือ
- ทอยลูกเต๋า
- จับเวลา
- สุ่มทีม
- ตารางคะแนน
- จัดสายการแข่งขัน
- จับเวลาสำหรับแข่ง
- จับสลาก
- Host Tools

## 🚀 Deployment

โปรเจค deploy อัตโนมัติผ่าน GitHub Actions เมื่อ push ไปที่ `main` branch

ดูรายละเอียดใน [DEPLOYMENT_INSTRUCTIONS.md](./staygo-nextjs/DEPLOYMENT_INSTRUCTIONS.md)

## 🛠️ เทคโนโลยีที่ใช้

- **Next.js 16** - React Framework
- **TypeScript** - Type-safe JavaScript
- **React 19** - UI Library
- **Static Export** - สำหรับ GitHub Pages
- **GitHub Actions** - CI/CD

## 📝 License

© STAYGO 2025

## 🤝 Contact

ติดต่อทีมงาน STAYGO ผ่านช่องทาง:
- YouTube: [@STAYGO](https://www.youtube.com/@STAYGO)
- Facebook: [STAYG0](https://facebook.com/STAYG0)
- Instagram: [@staygo.official](https://instagram.com/staygo.official)
- TikTok: [@staygo.official](https://tiktok.com/@staygo.official)
- Twitch: [staygogamming](https://twitch.tv/staygogamming)

---

**โปรเจคหลัก:** `staygo-nextjs/` 📂

# 🚀 Quick Deploy Guide

## ขั้นตอนการ Deploy

### 1. Commit และ Push

```bash
cd /Users/mildminihi/staygo-web

# ตรวจสอบไฟล์ที่เปลี่ยนแปลง
git status

# Add ไฟล์ทั้งหมด
git add .

# Commit
git commit -m "Migrate to Next.js and setup deployment"

# Push ไปที่ main branch
git push origin main
```

### 2. ตรวจสอบ GitHub Actions

1. ไปที่ GitHub repository ของคุณ
2. คลิกแท็บ **Actions**
3. ดู workflow "Deploy Next.js to GitHub Pages" ที่กำลัง run
4. รอจนกว่าจะเห็น ✅ สีเขียว (ใช้เวลาประมาณ 2-3 นาที)

### 3. ตรวจสอบ GitHub Pages Settings

1. ไปที่ **Settings** → **Pages**
2. ตรวจสอบว่า:
   - Source: **GitHub Actions**
   - Custom domain: **staygoch.com**
   - Enforce HTTPS: ✅ เปิดอยู่

### 4. ทดสอบเว็บไซต์

เปิดเบราว์เซอร์และทดสอบ:
- ✅ https://staygoch.com/
- ✅ https://staygoch.com/about/
- ✅ https://staygoch.com/games/
- ✅ https://staygoch.com/games/reveal-board/
- ✅ https://staygoch.com/tools/dice/

## 🔍 Troubleshooting

### ถ้า Workflow ล้มเหลว (❌)

1. คลิกเข้าไปดู workflow run ที่ล้มเหลว
2. คลิก job "build" เพื่อดู error
3. ปัญหาที่พบบ่อย:
   - **npm ci ล้มเหลว**: ลบ `node_modules/` และ `package-lock.json` แล้ว run `npm install` ใหม่
   - **Build ล้มเหลว**: ทดสอบ `npm run build` ใน local ก่อน
   - **Permission denied**: ตรวจสอบ Permissions ใน workflow

### ถ้าเว็บไซต์ไม่แสดง (404)

1. รอ 5-10 นาที สำหรับ DNS propagation
2. ตรวจสอบว่า `out/` มีไฟล์ index.html
3. ลอง clear browser cache (Ctrl+Shift+R หรือ Cmd+Shift+R)
4. ตรวจสอบ CNAME file ใน `staygo-nextjs/public/CNAME`

### ถ้า Static HTML (games/tools) ไม่ทำงาน

1. ตรวจสอบว่าไฟล์อยู่ใน `staygo-nextjs/public/games/` และ `staygo-nextjs/public/tools/`
2. ทดสอบ local ด้วย `npm run build && npx serve out`
3. ดู network tab ใน browser DevTools เพื่อดู error

## 📊 Workflow Overview

```
Push to main
    ↓
GitHub Actions triggers
    ↓
cd staygo-nextjs/
    ↓
npm ci (install)
    ↓
npm run build (build Next.js)
    ↓
Upload out/ folder
    ↓
Deploy to GitHub Pages
    ↓
Live at staygoch.com ✨
```

## 🎯 Next Steps

หลังจาก deploy สำเร็จแล้ว:

1. ✅ ทดสอบทุก features บนเว็บไซต์จริง
2. ✅ ตรวจสอบ SEO ด้วย Google Search Console
3. ✅ เพิ่ม Analytics (ถ้าต้องการ)
4. ⏳ รอ 1-2 สัปดาห์แล้วลบ `_old-html/` ออก

## 🆘 Need Help?

- อ่าน [DEPLOYMENT_INSTRUCTIONS.md](./staygo-nextjs/DEPLOYMENT_INSTRUCTIONS.md)
- อ่าน [MIGRATION_GUIDE.md](./staygo-nextjs/MIGRATION_GUIDE.md)
- ดู GitHub Actions logs สำหรับ error messages


# Quick Start: Deploy staygoch.com 🚀

## สรุปขั้นตอนสั้นๆ สำหรับการ deploy

### ✅ สิ่งที่พร้อมแล้ว

- ✅ Domain: **staygoch.com**
- ✅ ไฟล์ `CNAME` พร้อมแล้ว
- ✅ URL ทั้งหมดเป็น `https://staygoch.com` แล้ว
- ✅ SEO ready (sitemap, robots.txt, meta tags)
- ✅ PWA ready (manifest.json)

---

## 📝 ขั้นตอนที่ต้องทำ

### 1. Push โค้ดขึ้น GitHub

```bash
cd /Users/mildminihi/staygo-web

# Initialize git (ถ้ายังไม่ได้ทำ)
git init
git add .
git commit -m "Initial commit: STAYGO website ready for staygoch.com"

# เชื่อม GitHub (แทนที่ YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/staygo-web.git
git branch -M main
git push -u origin main
```

---

### 2. เปิดใช้ GitHub Pages

1. ไปที่ https://github.com/YOUR_USERNAME/staygo-web/settings/pages
2. ใน **Source** เลือก **Deploy from a branch**
3. เลือก branch: **main** และ folder: **/ (root)**
4. กด **Save**
5. GitHub จะตรวจจับไฟล์ `CNAME` อัตโนมัติ
6. ✅ เช็ค **Enforce HTTPS** (จะเปิดได้เมื่อ DNS พร้อม)

---

### 3. ตั้งค่า DNS

ไปที่เว็บที่ซื้อ domain (Namecheap, GoDaddy, etc.)

#### เพิ่ม A Records:

| Type | Host | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

#### เพิ่ม CNAME Record:

| Type | Host | Value |
|------|------|-------|
| CNAME | www | YOUR_USERNAME.github.io. |

**⚠️ สำคัญ:**
- แทนที่ `YOUR_USERNAME` ด้วย GitHub username จริง
- ต้องมีจุด (`.`) ท้าย `github.io.`

📖 **คู่มือละเอียด:** [DNS-SETUP.md](DNS-SETUP.md)

---

### 4. รอและทดสอบ

1. **รอ DNS propagate**: 15 นาที - 24 ชั่วโมง (โดยปกติ 1-2 ชม.)
2. **ตรวจสอบ DNS**:
   ```bash
   dig staygoch.com
   ```
3. **เปิดเว็บ**: https://staygoch.com
4. **เช็ค HTTPS**: ดูให้มี 🔒 ข้างหน้า URL

---

## 🔍 เช็คสถานะ

### ดู DNS Propagation:
- https://dnschecker.org (ใส่ `staygoch.com`)
- https://www.whatsmydns.net

### ดู GitHub Pages Status:
- ไปที่ Settings → Pages
- จะแสดงสถานะ: "Your site is live at https://staygoch.com"

---

## 🎯 เมื่อเสร็จแล้ว

เว็บจะทำงานที่:
- ✅ https://staygoch.com
- ✅ https://www.staygoch.com (redirect)
- ✅ HTTPS enabled 🔒
- ✅ ทุกหน้าทำงานปกติ

---

## 📚 เอกสารเพิ่มเติม

- [README.md](README.md) - ข้อมูลโปรเจค
- [DEPLOYMENT.md](DEPLOYMENT.md) - คู่มือ deploy ฉบับเต็ม
- [DNS-SETUP.md](DNS-SETUP.md) - คู่มือตั้งค่า DNS แบบละเอียด

---

## 🆘 ถ้ามีปัญหา

1. เช็คว่า DNS ตั้งค่าถูกต้อง (ใช้ dig หรือ dnschecker.org)
2. รอให้ DNS propagate (สูงสุด 24 ชั่วโมง)
3. เช็ค GitHub Pages status ที่ Settings → Pages
4. Clear browser cache: Cmd+Shift+R (Mac) หรือ Ctrl+Shift+R (Windows)
5. ดู troubleshooting ใน [DNS-SETUP.md](DNS-SETUP.md)

---

**Good luck! 🎉**


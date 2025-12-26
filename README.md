# STAYGO

เว็บสำหรับช่อง YouTube "STAYGO" เพื่อรวมเกมและเครื่องมือที่เล่นได้บนเว็บ

## โครงสร้างโปรเจค

```
staygo-web/
├── index.html              # หน้าหลัก
├── assets/
│   ├── css/
│   │   └── site.css       # Stylesheet หลัก
│   ├── js/
│   │   ├── config.js      # Configuration
│   │   └── site.js        # JavaScript หลัก
│   └── image/             # รูปภาพและ favicon
├── games/
│   ├── index.html         # หน้ารวมเกมทั้งหมด
│   ├── cardloop/          # เกมทายไพ่ 4 คำถาม
│   └── reveal-board/      # เกมกระดานเปิดช่อง
└── tools/
    ├── dice/              # เครื่องมือทอยลูกเต๋า
    ├── timer/             # เครื่องมือตั้งเวลา
    ├── team-randomizer/   # สุ่มทีม
    └── scoreboard/        # ตารางคะแนน
```

## Features

### เกม (Games)
- **Cardloop**: เกมทายไพ่ 52 ใบด้วย 4 คำถาม (สีแดง/ดำ, สูง/ต่ำ, อยู่ระหว่าง/นอกช่วง, ทายหน้าไพ่)
- **Reveal Board**: เกมกระดานเปิดช่อง (ฝังจากไฟล์ local)

### เครื่องมือ (Tools)
- **Dice**: ทอยลูกเต๋า
- **Timer**: ตั้งเวลา
- **Team Randomizer**: สุ่มแบ่งทีมด้วยชื่อสมาชิก รองรับ 3 โหมด (2-8 ทีม, จำนวนคนต่อทีม, แบ่งทีมอิสระ)
- **Scoreboard**: ตารางคะแนนพร้อมแสดงสมาชิกในทีม รองรับข้อมูลจาก Team Randomizer หรือป้อนเอง

## Run locally

ตัวเว็บเป็น static files แนะนำรันผ่าน local server:

```bash
# Node.js
node dev-server.mjs

# หรือ Python
python -m http.server 5173
```

แล้วเปิด `http://localhost:5173/`

## Deploy

### GitHub Pages (แนะนำ)

1. สร้าง repository บน GitHub
2. Push โค้ดขึ้น GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/staygo-web.git
git push -u origin main
```

3. เปิดใช้ GitHub Pages:
   - ไปที่ Settings → Pages
   - Source: เลือก "GitHub Actions" (แนะนำ - มี workflow ใน `.github/workflows/deploy.yml` แล้ว)
   - หรือเลือก "Deploy from a branch" → main → / (root)

4. เว็บจะทำงานที่ `https://USERNAME.github.io/staygo-web/`

ดูรายละเอียดเพิ่มเติมใน [DEPLOYMENT.md](DEPLOYMENT.md)

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Styling**: CSS Custom Properties, Grid, Flexbox
- **Fonts**: Inter, Kanit (Google Fonts)
- **Deployment**: GitHub Pages with GitHub Actions
- **Development**: Static site (no build step required)

## License

สร้างสำหรับช่อง YouTube "STAYGO" 🎮

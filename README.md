# STAYGO

เว็บสำหรับช่อง YouTube “STAYGO” เพื่อรวมเกมที่เล่นได้บนเว็บ

## Pages

- Home: `/` (แสดงคลิปล่าสุดจาก YouTube + ปุ่มไปหน้าเลือกเกม)
- Games: `/games/` (หน้าเลือกเกม)
- Reveal Board: `/games/reveal-board/` (ฝังเกมจากไฟล์ในเว็บนี้ผ่าน iframe)

## Add Reveal Board files (local)

นำไฟล์จากโฟลเดอร์ที่คุณดาวน์โหลดมาใส่ไว้ที่ `games/reveal-board/app/`:

- `index.html`
- `reveal-board.js`
- `staygo-logo.png`

## Configure YouTube (Latest Clip)

แก้ไฟล์ `assets/config.js`:

- `latestYouTubeVideoId`: ใส่ YouTube video id เช่น `dQw4w9WgXcQ`

ถ้าเว้นว่าง หน้า Home จะโชว์ข้อความให้ตั้งค่าแทน

## Configure YouTube (All Videos + Playlist + Search)

หน้า Home รองรับการดึง “คลิปทั้งหมดแยกตาม Playlist” และค้นหาชื่อคลิปได้ (ต้องใช้ YouTube Data API v3)

แก้ไฟล์ `assets/config.js`:

- `youTubeApiKey`: API key ของ YouTube Data API v3
- `youTubeChannelId`: Channel ID ของช่อง (รูปแบบประมาณ `UC...`)
- `youTubeMaxPlaylists`: จำนวน playlist สูงสุดที่ดึง (ตั้ง `0` เพื่อพยายามดึงทั้งหมด)
- `youTubeMaxVideosPerPlaylist`: จำนวนคลิปสูงสุดต่อ playlist (ตั้ง `0` เพื่อพยายามดึงทั้งหมด)

ถ้า `youTubeApiKey`/`youTubeChannelId` ยังว่าง จะไม่แสดงรายการคลิป (โชว์ข้อความแนะนำการตั้งค่าแทน)

## Run locally

ตัวเว็บเป็น static files แนะนำรันผ่าน local server:

- Node.js:
  - `node dev-server.mjs`

หรือถ้ามี Python:
  - `python -m http.server 5173`

แล้วเปิด `http://localhost:5173/`

## Deploy

สามารถ deploy ด้วย GitHub Pages ได้เลย (เพราะเป็น static) โดยตั้งค่าให้เสิร์ฟจาก root ของ repo

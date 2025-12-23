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

## YouTube API Security (สำคัญ)

เว็บนี้เป็น static (รันบนเบราว์เซอร์ล้วน) ดังนั้นถ้าคุณใส่ `youTubeApiKey` ลงใน `assets/config.js`:

- API key จะถูกดาวน์โหลดไปอยู่บนเครื่องผู้ใช้ (มองเห็นได้ใน DevTools)
- ทำให้ “ซ่อน key” แบบ 100% ทำไม่ได้

ตัวเลือกที่ปลอดภัย/เหมาะสมมี 2 แบบ:

### A) ไม่ใช้ Data API เลย (ปลอดภัยสุด)

- เว้น `youTubeApiKey` ว่าง
- ใช้ `latestYouTubeVideoId` เพื่อฝังคลิปล่าสุดแบบ manual
- หน้าเว็บจะใช้ YouTube embed (`youtube-nocookie.com`) ซึ่งไม่ต้องใช้ key

### B) ใช้ Data API แต่ทำให้ปลอดภัยขึ้น

**ทางเลือก B1 — ใช้ API key ในฝั่ง client (ทำได้ แต่อยู่ในระดับ “จำกัดความเสี่ยง”)**

1) ไปที่ Google Cloud Console → สร้าง API key
2) เปิดใช้ “YouTube Data API v3”
3) ตั้งค่า Restriction:
   - Application restrictions: เลือก “HTTP referrers (web sites)”
     - เพิ่มโดเมนของคุณ เช่น `https://yourdomain.com/*`
     - เพิ่มโลคัล เช่น `http://localhost:5173/*`
   - API restrictions: เลือก “Restrict key” แล้วเลือกเฉพาะ “YouTube Data API v3”
4) ตั้ง Quota/Alert และเตรียม rotate key เมื่อจำเป็น

**ทางเลือก B2 — แนะนำที่สุด: ทำ Proxy ฝั่งเซิร์ฟเวอร์/Serverless (ซ่อน key ได้จริง)**

- เก็บ API key ไว้ใน env ของ serverless (เช่น Cloudflare Workers / Netlify Functions / Vercel)
- หน้าเว็บเรียก proxy ของคุณแทน Google โดยตั้งค่าใน `assets/config.js`:
  - `youTubeApiBaseUrl`: ตัวอย่าง `https://your-worker.example.com/youtube/v3`
  - เว้น `youTubeApiKey` ว่างได้ (ให้ proxy ใส่ key ให้เอง)
- ฝั่ง proxy ควรทำเพิ่ม:
  - จำกัด CORS ให้เรียกได้เฉพาะโดเมนของคุณ
  - ใส่ rate limit / caching (ลด quota และกัน abuse)


## Run locally

ตัวเว็บเป็น static files แนะนำรันผ่าน local server:

- Node.js:
  - `node dev-server.mjs`

หรือถ้ามี Python:
  - `python -m http.server 5173`

แล้วเปิด `http://localhost:5173/`

## Deploy

สามารถ deploy ด้วย GitHub Pages ได้เลย (เพราะเป็น static) โดยตั้งค่าให้เสิร์ฟจาก root ของ repo

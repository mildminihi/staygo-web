// รายการ (เพลย์ลิสต์) ที่โปรโมทบนเว็บ — หน้าแรกและหน้า /watch
// อยากเพิ่มรายการใหม่: ใส่ key, id ของเพลย์ลิสต์, ชื่อ และคำโปรย แล้ว build ใหม่
// รายชื่อคลิปดึงเองจาก YouTube ตอน build (scripts/fetch-youtube.mjs) เก็บไว้ใน youtube.json

export const CHANNEL_ID = 'UC5Z1w5HIJKqXCegr4zHH5Wg';
// UULF + รหัสช่อง = คลิปยาวทั้งหมดของช่อง เรียงใหม่ไปเก่า (ไม่รวม Shorts)
export const LATEST_PLAYLIST_ID = 'UULF' + CHANNEL_ID.slice(2);

export type PlaylistInfo = {
  key: string;
  id: string;
  name: string;
  tagline: string;
  emoji: string;
};

export const PLAYLISTS: PlaylistInfo[] = [
  { key: 'boardgame', id: 'PLG20mBG6czamQSIVdji-enijsr0oXadk-', name: 'บอร์ดเกม', tagline: 'สอนเล่นและเล่นจริง บอร์ดเกมใหม่ทุกสัปดาห์', emoji: '🎲' },
  { key: 'challenge', id: 'PLG20mBG6czalQt2B94Ml8TqAQfvPRZhfU', name: 'แก๊งซ่า Challenge', tagline: 'ภารกิจท้าทาย ตอบคำถาม แข่งกันเอง', emoji: '🔥' },
  { key: 'stackgo', id: 'PLG20mBG6czamZSiOgxFev0vhWe2ol5Lam', name: 'สะแตกโก', tagline: 'แก๊ง STAYGO พาไปกินร้านเด็ด', emoji: '🍜' },
  { key: 'aowa', id: 'PLG20mBG6czanI9BkKuIhlYlsAf8tJwkaC', name: 'เอาวะลองดู', tagline: 'ลองของใหม่ เล่นอะไรแปลกๆ ด้วยกัน', emoji: '🤪' },
  { key: 'gameonly', id: 'PLG20mBG6czan_lJEd2C4djODeMQl9jb76', name: 'เกมมีเท่านี้', tagline: 'เกมเล็กๆ เล่นจบไว ลองดูว่าสนุกไหม', emoji: '🃏' },
  { key: 'story', id: 'PLG20mBG6czakGL2XId3vjhhmrHOKd1bIq', name: 'StayGO Story', tagline: 'เบื้องหลัง งานบอร์ดเกม และเรื่องเล่าของแก๊ง', emoji: '📖' },
];

export const playlistUrl = (id: string) => `https://www.youtube.com/playlist?list=${id}`;

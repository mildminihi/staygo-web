// เกมเล่นบนเว็บ — ใช้ทั้งหน้าแรก (แสดงแค่ HOME_GAME_LIMIT เกมแรก) และหน้า /games

export type WebGameCover =
  | { images: [string, string] }
  | { emoji: string; background: string; color?: string };

export type WebGame = {
  href: string;
  title: string;
  meta: string;
  short: string;
  description: string;
  cover: WebGameCover;
  beta?: boolean;
  cta?: string;
};

export const HOME_GAME_LIMIT = 4;

export const WEB_GAMES: WebGame[] = [
  {
    href: '/games/reveal-board/',
    title: 'เปิดแผ่นป้ายทายภาพ',
    meta: '4–20 Players • เกมปาร์ตี้',
    short: 'เปิดแผ่นป้ายทีละช่องเพื่อทายภาพ',
    description: 'เปิดแผ่นป้ายทีละช่องเพื่อทายภาพ เหมาะสำหรับเล่นเป็นกลุ่ม',
    cover: { images: ['/assets/image/reveal-cover-1.png', '/assets/image/reveal-cover-2.png'] },
  },
  {
    href: '/games/cardloop/',
    title: 'ลูปนรกหมกมุ่น',
    meta: '1 Player • เกมไพ่',
    short: 'ตอบคำถาม 4 ข้อติดเพื่อชนะ',
    description: 'ตอบคำถาม 4 ข้อให้ถูกต้องติดต่อกันเพื่อชนะ เกมท้าทายความจำและโชค',
    cover: { images: ['/assets/image/cardloop-cover-1.png', '/assets/image/cardloop-cover-2.png'] },
  },
  {
    href: '/games/emoji-match/',
    title: 'จับคู่อีโมจิ',
    meta: '1 Player • เกมจำ',
    short: 'จับคู่อีโมจิให้ถูกต้อง',
    description: 'จับคู่อีโมจิให้ถูกต้อง เลือกระดับความยากและโหมดจับเวลา',
    cover: { images: ['/assets/image/match-cover-1.png', '/assets/image/match-cover-2.png'] },
  },
  {
    href: '/games/dice-roguelike/',
    title: 'Dice Roguelike',
    meta: '1 Player • เกมกลยุทธ์',
    short: 'ทอยเต๋าผจญภัยใน Dungeon',
    description: 'เกมผจญภัยด้วยลูกเต๋า วางแผนการต่อสู้แบบเทิร์นเบส รวบรวมไอเทมและเอาชนะบอส',
    cover: { images: ['/assets/image/dice-rouge-cover-1.png', '/assets/image/dice-rouge-cover-2.png'] },
    beta: true,
  },
  {
    href: '/games/decoder/',
    title: 'ถอดรหัสตัวเลข',
    meta: '1 Player • เกมปริศนา',
    short: 'ทายตัวเลขลับภายใน 8 ครั้ง',
    description: 'ใช้ logic ทายตัวเลขลับภายใน 8 ครั้ง ด้วยระบบสีที่บอกคำใบ้ เหมือน Mastermind',
    cover: { images: ['/assets/image/decoder-cover-1.png', '/assets/image/decoder-cover-2.png'] },
  },
  {
    href: '/games/dice-challenge/',
    title: 'เกมทอยเต๋า',
    meta: 'Multiplayer • เกมทอยเต๋า',
    short: 'เลือกแผ่นป้ายและทอยเต๋าเพื่อเก็บแต้ม',
    description: 'เลือกแผ่นป้ายและทอยเต๋า d6 เพื่อเก็บแต้ม รองรับโหมดปกติและโหมด Team สำหรับจัดกิจกรรม',
    cover: { emoji: '🎲', background: '#3B82F6' },
  },
  {
    href: '/games/dungeon-ledger/',
    title: 'Dungeon Ledger',
    meta: '1 Player • เกม Idle ผจญภัย',
    short: 'สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle',
    description: 'สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle เก็บไอเทม ตีเสริมพลัง แล้วบันทึกทุกการต่อสู้ลงในสมุดบัญชี',
    cover: { emoji: '📜', background: '#CA8A04' },
    beta: true,
  },
  {
    href: '/games/ouroboros/',
    title: 'Ouroboros',
    meta: '2–6 Players • เกมกระดานไล่ล่า',
    short: 'งูกินหาง เป็นทั้งผู้ล่าและผู้ถูกล่า รอดคนสุดท้ายชนะ',
    description: 'วนรอบบนกระดาน เลือกลูกเต๋าแบบปิดหน้าจอ ไล่กินคู่แข่ง รอดคนสุดท้ายคือผู้ชนะ เล่นแบบส่งต่ออุปกรณ์เดียวหรือห้องออนไลน์',
    cover: { emoji: '🐍', background: '#3B82F6' },
  },
  {
    href: '/games/zoom-quiz/',
    title: 'Zoom Quiz',
    meta: 'Multiplayer • เกมทายภาพ',
    short: 'สร้าง quiz ภาพซูมของตัวเอง แล้วให้เพื่อนทาย',
    description: 'สร้างเกมทายภาพของตัวเอง ใส่รูปแล้วเพิ่มตัวเลือกช่วยทายได้ ภาพจะซูมเข้าสุดแล้วค่อยๆ ซูมออก ให้ทุกคนช่วยกันทาย',
    cover: { emoji: '🔍', background: '#FACC15', color: '#111827' },
  },
  {
    href: '/games/thai-wordle/',
    title: 'ทายคำศัพท์ 5 ตัว',
    meta: '1 Player • เกมทายคำ',
    short: 'ทายคำศัพท์ไทยสไตล์ Wordle มีคำประจำวันให้เล่นทุกวัน',
    description: 'เกมทายคำศัพท์ไทยสไตล์ Wordle ทายให้ถูกภายใน 6 ครั้ง มีคำประจำวันให้เล่นทุกวันและโหมดฝึกฝนเล่นได้ไม่จำกัด',
    cover: { emoji: '🔤', background: '#6366F1' },
  },
  {
    href: '/games/jinxo-board/',
    title: 'กระดานจดแต้มสำหรับ JinxO',
    meta: '4–7 Players • กระดานช่วยเล่นบอร์ดเกม',
    short: 'ใช้แทนกระดานผู้เล่น คู่กับเกมตัวจริง',
    description: 'เครื่องมือเสริมสำหรับเล่นคู่กับเกม JinxO ตัวจริง ใช้มือถือแทนกระดานผู้เล่น เขียนคำตอบ วงกลม กากบาท ดาว Jinx พร้อมนับโบนัสและคะแนน 3 รอบให้อัตโนมัติ',
    cover: { emoji: '⭐', background: '#FACC15', color: '#111827' },
    cta: 'เปิดกระดาน',
  },
];

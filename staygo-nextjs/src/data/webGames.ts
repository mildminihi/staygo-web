// เกมเล่นบนเว็บ — ใช้ทั้งหน้าแรก (จำนวนต่อหมวดดู HOME_GAMES_PER_CATEGORY) และหน้า /games

export type WebGameCover =
  | { images: [string, string] }
  | { emoji: string; background: string; color?: string };

export type GameCategoryId = 'staygo' | 'party' | 'solo';

export type GameCategory = {
  id: GameCategoryId;
  icon: string;
  title: string;
  subtitle: string;
};

// ลำดับในนี้คือลำดับที่แสดงบนหน้าเว็บ
export const GAME_CATEGORIES: GameCategory[] = [
  { id: 'staygo', icon: '🃏', title: 'Board Game Online by STAYGO', subtitle: 'บอร์ดเกมของ STAYGO เล่นออนไลน์กับเพื่อนได้เลย' },
  { id: 'party', icon: '🎉', title: 'Party Game', subtitle: 'เปิดจอใหญ่ เล่นกันเป็นกลุ่มจากมือถือ' },
  { id: 'solo', icon: '🕹️', title: 'เล่นคนเดียว', subtitle: 'เกมเล่นคนเดียวบนเว็บ ทั้งมือถือและคอม' },
];

export type WebGame = {
  href: string;
  category: GameCategoryId;
  title: string;
  meta: string;
  short: string;
  description: string;
  cover: WebGameCover;
  beta?: boolean;
  cta?: string;
};

// จำนวนเกมที่โชว์ในหน้าแรกของแต่ละหมวด — 2 = ครึ่งแถว (วางคู่กับหมวดถัดไป), 4 = เต็มแถว
export const HOME_GAMES_PER_CATEGORY: Record<GameCategoryId, 2 | 4> = { staygo: 2, party: 2, solo: 4 };

export const WEB_GAMES: WebGame[] = [
  {
    href: '/staygo/',
    category: 'staygo',
    title: 'STAYGO! ออนไลน์',
    meta: '2–5 Players • เกมการ์ดออนไลน์',
    short: 'เรียงแถว S-T-A-Y-G-O ให้ครบก่อนใคร',
    description: 'เกมการ์ด STAYGO! เล่นออนไลน์กับเพื่อนคนละเครื่อง สร้างห้องแล้วแชร์รหัส เรียงแถว S T A Y G O ให้ครบก่อนใคร ใช้พลัง Swap Take Again Yolo Got Oops! แกล้งกันได้เต็มที่',
    cover: { images: ['/assets/image/staygo-cover-1.webp', '/assets/image/staygo-cover-2.webp'] },
    beta: true,
    cta: 'สร้าง / เข้าห้อง',
  },
  {
    href: '/games/speed-draw/',
    category: 'party',
    title: 'วาดไว 15 วิ',
    meta: '2–30 Players • เกมวาดรูปปาร์ตี้',
    short: 'วาดตามโจทย์ข้อละ 15 วิ 10 รูปรวด แล้วสลับกันเรียงรูปของเพื่อน',
    description: 'เกมปาร์ตี้วาดรูปบนมือถือ โฮสต์เปิดห้องบนจอใหญ่ ทุกคนวาดโจทย์เดียวกันข้อละ 15 วินาทีติดกัน 10 รูป แล้วสลับกันเรียงรูปของเพื่อนให้ตรงกับโจทย์ เรียงถูกกี่ข้อ ได้คะแนนทั้งคนเรียงและเจ้าของรูป',
    cover: { images: ['/assets/image/speed-draw-cover-1.webp', '/assets/image/speed-draw-cover-2.webp'] },
    cta: 'สร้าง / เข้าห้อง',
  },
  {
    href: '/games/lunjua/',
    category: 'staygo',
    title: 'ลุ้นจั่ว',
    meta: '2–6 Players • เกมเสี่ยงดวง',
    short: 'เปิดการ์ดทีละใบ เก็บ STAYGO ให้ครบ ตัวซ้ำ = ระเบิด!',
    description: 'เกมเสี่ยงดวงด้วยการ์ด STAYGO เล่นบนเครื่องเดียว เปิดการ์ดทีละใบเก็บตัวอักษร S T A Y G O ให้ครบก่อนใคร แต่ถ้าเปิดได้ตัวซ้ำในเทิร์นเดียว ระเบิด! มีโหมดจอใหญ่สำหรับเปิดให้ทุกคนดู',
    cover: { images: ['/assets/image/lunjua-cover-1.webp', '/assets/image/lunjua-cover-2.webp'] },
  },
  {
    href: '/games/flipped/',
    category: 'solo',
    title: 'FLIPPED: พินบอลกลับด้าน',
    meta: '1 Player • เกมฟิสิกส์ Roguelike',
    short: 'คุณคือลูกเหล็ก ไม้ตีคือบอส ลงหลุมให้ได้!',
    description: 'พินบอลกลับด้านแนว roguelike คุณเป็นลูกเหล็กที่ดีดตัวเองชนบัมเปอร์ ทำลายเกราะแล้วพุ่งชนไม้ตีให้พังจนลงหลุมได้ เก็บบัฟทุกตู้ ตายแล้วเอาเศษเหล็กไปอัปเกรดถาวร เล่นได้ทั้งมือถือและคอม',
    cover: { images: ['/assets/image/flipped-cover-1.webp', '/assets/image/flipped-cover-2.webp'] },
    beta: true,
  },
  {
    href: '/games/scribble-spy/',
    category: 'party',
    title: 'ใครวาดมั่ว',
    meta: '3–20 Players • เกมวาดรูปจับผิด',
    short: 'ทุกคนรู้คำยกเว้น 1 คน ผลัดกันวาดคนละเส้น แล้วโหวตจับคนวาดมั่ว',
    description: 'เกมปาร์ตี้วาดรูปจับผิด เปิดจอกลางบนทีวีหรือคอม ทุกคนเข้าห้องจากมือถือ เกือบทุกคนเห็นคำลับ ยกเว้นคนวาดมั่ว 1 คน ผลัดกันวาดคนละเส้นบนภาพเดียวกัน แล้วโหวตหาตัวคนที่ไม่รู้คำ ถ้าโดนจับยังพลิกชนะได้ด้วยการเดาคำ',
    cover: { images: ['/assets/image/scribble-spy-cover-1.webp', '/assets/image/scribble-spy-cover-2.webp'] },
    beta: true,
    cta: 'สร้าง / เข้าห้อง',
  },
  {
    href: '/games/market-run/',
    category: 'solo',
    title: 'แม่ฝากซื้อ',
    meta: '1 Player • เกมจ่ายตลาดแข่งเวลา',
    short: 'ซื้อของให้แม่ให้ครบ หาร้านลดราคา เงินที่เหลือคือค่าขนม!',
    description: 'แม่ให้เงินไปจ่ายตลาด ซื้อของตามลิสต์ให้ครบก่อนหมดเวลา แต่ละร้านราคาและโปรสุ่มใหม่ทุกวัน ต้องเดินไปเช็กเอง ระวังแฟลชเซลที่มาแป๊บเดียว ยิ่งเหลือเงินมาก ยิ่งได้ค่าขนมไปซื้อขนมและของเล่น เล่น 3 วันแล้วบันทึกคะแนนลงกระดาน',
    cover: { images: ['/assets/image/market-run-cover-1.webp', '/assets/image/market-run-cover-2.webp'] },
    beta: true,
  },
  {
    href: '/games/rider-rush/',
    category: 'solo',
    title: 'ด่วนจี๋ทะลุแยก',
    meta: '1 Player • เกมต่อถนนแข่งเวลา',
    short: 'หมุนถนนให้ต่อกัน รับข้าวไปส่งให้ทันก่อนข้าวเย็น ส่งได้ไม่รู้จบ!',
    description: 'เกม puzzle แข่งกับเวลา แตะหมุนถนนให้ต่อจากไรเดอร์ไปถึงร้าน รับข้าวแล้วรีบต่อทางไปส่งบ้านลูกค้า ส่งต่อไปเรื่อยๆ ไม่รู้จบ ยิ่งข้าวร้อนยิ่งได้ทิปเยอะ ยิ่งส่งเยอะยิ่งยาก มีถนนปิดซ่อม รถติด หมาวิ่งขวางทาง และฝนตก เล่นได้ทั้งมือถือและคอม',
    cover: { images: ['/assets/image/rider-rush-cover-1.webp', '/assets/image/rider-rush-cover-2.webp'] },
    beta: true,
  },
  {
    href: '/games/emoji-match/',
    category: 'solo',
    title: 'จับคู่อีโมจิ',
    meta: '1 Player • เกมจำ',
    short: 'จับคู่อีโมจิให้ถูกต้อง',
    description: 'จับคู่อีโมจิให้ถูกต้อง เลือกระดับความยากและโหมดจับเวลา',
    cover: { images: ['/assets/image/match-cover-1.webp', '/assets/image/match-cover-2.webp'] },
  },
  {
    href: '/games/dice-roguelike/',
    category: 'solo',
    title: 'Dice Roguelike',
    meta: '1 Player • เกมกลยุทธ์',
    short: 'ทอยเต๋าผจญภัยใน Dungeon',
    description: 'เกมผจญภัยด้วยลูกเต๋า วางแผนการต่อสู้แบบเทิร์นเบส รวบรวมไอเทมและเอาชนะบอส',
    cover: { images: ['/assets/image/dice-rouge-cover-1.webp', '/assets/image/dice-rouge-cover-2.webp'] },
    beta: true,
  },
  {
    href: '/games/decoder/',
    category: 'solo',
    title: 'ถอดรหัสตัวเลข',
    meta: '1 Player • เกมปริศนา',
    short: 'ทายตัวเลขลับภายใน 8 ครั้ง',
    description: 'ใช้ logic ทายตัวเลขลับภายใน 8 ครั้ง ด้วยระบบสีที่บอกคำใบ้ เหมือน Mastermind',
    cover: { images: ['/assets/image/decoder-cover-1.webp', '/assets/image/decoder-cover-2.webp'] },
  },
  {
    href: '/games/dice-challenge/',
    category: 'party',
    title: 'เกมทอยเต๋า',
    meta: 'Multiplayer • เกมทอยเต๋า',
    short: 'เลือกแผ่นป้ายและทอยเต๋าเพื่อเก็บแต้ม',
    description: 'เลือกแผ่นป้ายและทอยเต๋า d6 เพื่อเก็บแต้ม รองรับโหมดปกติและโหมด Team สำหรับจัดกิจกรรม',
    cover: { images: ['/assets/image/dice-challenge-cover-1.webp', '/assets/image/dice-challenge-cover-2.webp'] },
  },
  {
    href: '/games/dungeon-ledger/',
    category: 'solo',
    title: 'Dungeon Ledger',
    meta: '1 Player • เกม Idle ผจญภัย',
    short: 'สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle',
    description: 'สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle เก็บไอเทม ตีเสริมพลัง แล้วบันทึกทุกการต่อสู้ลงในสมุดบัญชี',
    cover: { images: ['/assets/image/ledger-cover-1.webp', '/assets/image/ledger-cover-2.webp'] },
    beta: true,
  },
  {
    href: '/games/ouroboros/',
    category: 'staygo',
    title: 'Ouroboros',
    meta: '2–6 Players • เกมกระดานไล่ล่า',
    short: 'งูกินหาง เป็นทั้งผู้ล่าและผู้ถูกล่า รอดคนสุดท้ายชนะ',
    description: 'วนรอบบนกระดาน เลือกลูกเต๋าแบบปิดหน้าจอ ไล่กินคู่แข่ง รอดคนสุดท้ายคือผู้ชนะ เล่นแบบส่งต่ออุปกรณ์เดียวหรือห้องออนไลน์',
    cover: { images: ['/assets/image/ouroboros-cover-1.webp', '/assets/image/ouroboros-cover-2.webp'] },
  },
  {
    href: '/games/zoom-quiz/',
    category: 'party',
    title: 'Zoom Quiz',
    meta: 'Multiplayer • เกมทายภาพ',
    short: 'สร้าง quiz ภาพซูมของตัวเอง แล้วให้เพื่อนทาย',
    description: 'สร้างเกมทายภาพของตัวเอง ใส่รูปแล้วเพิ่มตัวเลือกช่วยทายได้ ภาพจะซูมเข้าสุดแล้วค่อยๆ ซูมออก ให้ทุกคนช่วยกันทาย',
    cover: { images: ['/assets/image/zoom-cover-1.webp', '/assets/image/zoom-cover-2.webp'] },
  },
  {
    href: '/games/thai-wordle/',
    category: 'solo',
    title: 'ทายคำศัพท์ 5 ตัว',
    meta: '1 Player • เกมทายคำ',
    short: 'ทายคำศัพท์ไทยสไตล์ Wordle มีคำประจำวันให้เล่นทุกวัน',
    description: 'เกมทายคำศัพท์ไทยสไตล์ Wordle ทายให้ถูกภายใน 6 ครั้ง มีคำประจำวันให้เล่นทุกวันและโหมดฝึกฝนเล่นได้ไม่จำกัด',
    cover: { images: ['/assets/image/wordle-cover-1.webp', '/assets/image/wordle-cover-2.webp'] },
  },
  {
    href: '/games/cardloop/',
    category: 'solo',
    title: 'ลูปนรกหมกมุ่น',
    meta: '1 Player • เกมไพ่',
    short: 'ตอบคำถาม 4 ข้อติดเพื่อชนะ',
    description: 'ตอบคำถาม 4 ข้อให้ถูกต้องติดต่อกันเพื่อชนะ เกมท้าทายความจำและโชค',
    cover: { images: ['/assets/image/cardloop-cover-1.webp', '/assets/image/cardloop-cover-2.webp'] },
  },
];

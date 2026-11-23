// Presets for โต๊ะผจญภัย. Everything here is a starting point: players and the GM can rename
// or change any of it at the table.

/** Stat systems the GM picks for the room. "classic": scores 3–20, bonus = (score − 10) / 2.
 *  "simple": the number is the bonus itself (−2 … +5). */
export const SYSTEMS = {
  classic: {
    label: "6 ค่าสถานะ (คะแนน 3–20)",
    mode: "classic",
    stats: [
      { k: "str", label: "พลัง", short: "พลัง" },
      { k: "dex", label: "ว่องไว", short: "ไว" },
      { k: "con", label: "อึดทน", short: "อึด" },
      { k: "int", label: "ปัญญา", short: "ปัญญา" },
      { k: "wis", label: "สัญชาตญาณ", short: "สัญชาต" },
      { k: "cha", label: "เสน่ห์", short: "เสน่ห์" },
    ],
    init: "dex",
  },
  simple: {
    label: "แบบง่าย 3 ค่า (ใส่เป็นโบนัสเลย)",
    mode: "simple",
    stats: [
      { k: "body", label: "ร่างกาย", short: "กาย" },
      { k: "mind", label: "จิตใจ", short: "ใจ" },
      { k: "wit", label: "ไหวพริบ", short: "ไหวพริบ" },
    ],
    init: "wit",
  },
};

export const RACES = ["มนุษย์", "เอลฟ์", "คนแคระ", "คนตัวจิ๋ว", "ครึ่งยักษ์", "มนุษย์สัตว์", "ภูตไม้", "ลูกครึ่งปีศาจ"];

/** Class presets: starting HP, AC, suggested scores (classic), starting abilities and gear. */
export const CLASSES = [
  {
    name: "นักรบ", emoji: "⚔️", hp: 12, ac: 16,
    stats: { str: 16, dex: 12, con: 15, int: 8, wis: 10, cha: 10 },
    abilities: [
      { name: "ฟันสุดแรง", desc: "โจมตีด้วยอาวุธหนัก", roll: "1d10+3", reset: "none" },
      { name: "ฮึดสู้", desc: "ฟื้น HP ทันที", roll: "1d10+1", max: 1, reset: "short" },
    ],
    items: [["ดาบยาว", 1], ["โล่", 1], ["ยาฟื้นพลัง", 2]],
  },
  {
    name: "จอมเวท", emoji: "🔮", hp: 6, ac: 12,
    stats: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
    abilities: [
      { name: "ลูกไฟ", desc: "ยิงไฟใส่ศัตรูในระยะ", roll: "3d6", max: 3, reset: "long" },
      { name: "โล่เวท", desc: "+5 ค่าป้องกันจนถึงเทิร์นถัดไป", max: 2, reset: "long" },
    ],
    items: [["ไม้เท้า", 1], ["ตำราเวท", 1], ["ยาฟื้นพลัง", 1]],
  },
  {
    name: "นักย่องเบา", emoji: "🗡️", hp: 8, ac: 14,
    stats: { str: 10, dex: 16, con: 12, int: 13, wis: 10, cha: 12 },
    abilities: [
      { name: "แทงข้างหลัง", desc: "ดาเมจเพิ่มเมื่อศัตรูไม่ทันตั้งตัว", roll: "1d4+3d6", reset: "none" },
      { name: "หลบหลีก", desc: "ลดดาเมจที่โดนลงครึ่งหนึ่ง", max: 1, reset: "short" },
    ],
    items: [["มีดสั้น", 2], ["ชุดสะเดาะกุญแจ", 1], ["เชือก", 1]],
  },
  {
    name: "นักบวช", emoji: "✨", hp: 8, ac: 15,
    stats: { str: 12, dex: 10, con: 13, int: 10, wis: 16, cha: 12 },
    abilities: [
      { name: "แสงรักษา", desc: "ฟื้น HP ให้เพื่อน 1 คน", roll: "1d8+3", max: 3, reset: "long" },
      { name: "ขับไล่ผี", desc: "ผีและอันเดดรอบตัวต้องหนี", max: 1, reset: "short" },
    ],
    items: [["กระบอง", 1], ["เครื่องรางศักดิ์สิทธิ์", 1], ["ผ้าพันแผล", 3]],
  },
  {
    name: "นักธนู", emoji: "🏹", hp: 10, ac: 14,
    stats: { str: 12, dex: 16, con: 13, int: 10, wis: 13, cha: 8 },
    abilities: [
      { name: "ยิงแม่น", desc: "ยิงธนูระยะไกล", roll: "1d8+3", reset: "none" },
      { name: "ยิงสองดอก", desc: "ยิง 2 ครั้งในเทิร์นเดียว", max: 1, reset: "short" },
    ],
    items: [["ธนู", 1], ["ลูกธนู", 20], ["มีดเดินป่า", 1]],
  },
  {
    name: "นักดนตรี", emoji: "🎻", hp: 8, ac: 13,
    stats: { str: 8, dex: 14, con: 12, int: 12, wis: 10, cha: 16 },
    abilities: [
      { name: "เพลงปลุกใจ", desc: "เพื่อน 1 คน +1d6 กับการทอยครั้งถัดไป", max: 3, reset: "long" },
      { name: "เพลงกล่อม", desc: "ศัตรูต้องทอยสัญชาตญาณ ไม่ผ่านจะหลับ", max: 1, reset: "long" },
    ],
    items: [["พิณ", 1], ["มีดสั้น", 1], ["เสื้อคลุมสวยๆ", 1]],
  },
  {
    name: "หมอผี", emoji: "💀", hp: 8, ac: 12,
    stats: { str: 8, dex: 12, con: 14, int: 12, wis: 13, cha: 16 },
    abilities: [
      { name: "คำสาป", desc: "ศัตรูเสียเปรียบในการทอยครั้งถัดไป", max: 2, reset: "short" },
      { name: "ลูกไฟผี", desc: "ยิงไฟสีเขียว", roll: "2d10", reset: "none" },
    ],
    items: [["เครื่องรางกระดูก", 1], ["ผงลึกลับ", 3]],
  },
  {
    name: "พรานป่า", emoji: "🐺", hp: 10, ac: 14,
    stats: { str: 13, dex: 15, con: 13, int: 10, wis: 14, cha: 8 },
    abilities: [
      { name: "สัตว์คู่ใจ", desc: "เรียกสัตว์ช่วยโจมตี", roll: "1d6+2", reset: "none" },
      { name: "ตามรอย", desc: "ได้เปรียบเมื่อสะกดรอยหรือหาทาง", reset: "none" },
    ],
    items: [["หอก", 1], ["ธนูสั้น", 1], ["เสบียง", 5]],
  },
];

export const AVATARS = ["🧙", "🧝", "🧛", "🧟", "🥷", "🤺", "🧚", "🦸", "🧌", "🐉", "🦊", "🐱", "🐻", "🦉", "🐸", "🤖", "👸", "🤴", "👻", "😼"];

export const CONDITIONS = [
  { k: "poison", e: "🤢", label: "ติดพิษ" },
  { k: "stun", e: "💫", label: "มึนงง" },
  { k: "burn", e: "🔥", label: "ติดไฟ" },
  { k: "freeze", e: "🧊", label: "แช่แข็ง" },
  { k: "sleep", e: "😴", label: "หลับ" },
  { k: "blind", e: "🙈", label: "มองไม่เห็น" },
  { k: "bound", e: "⛓️", label: "ถูกตรึง" },
  { k: "fear", e: "😱", label: "หวาดกลัว" },
  { k: "invis", e: "👻", label: "ล่องหน" },
  { k: "bless", e: "🌟", label: "ได้รับพร" },
  { k: "rage", e: "😤", label: "คลั่ง" },
  { k: "down", e: "💀", label: "หมดสติ" },
];

/** Monster presets: hp, ac, init bonus, attack roll. */
export const MONSTERS = [
  { name: "สไลม์", e: "🟢", hp: 10, ac: 8, init: -2, atk: "1d6" },
  { name: "ก็อบลิน", e: "👺", hp: 7, ac: 13, init: 2, atk: "1d6+2" },
  { name: "หมาป่า", e: "🐺", hp: 11, ac: 13, init: 2, atk: "2d4+2" },
  { name: "โครงกระดูก", e: "💀", hp: 13, ac: 13, init: 2, atk: "1d6+2" },
  { name: "โจรป่า", e: "🥷", hp: 11, ac: 12, init: 1, atk: "1d6+1" },
  { name: "ซอมบี้", e: "🧟", hp: 22, ac: 8, init: -2, atk: "1d6+1" },
  { name: "แมงมุมยักษ์", e: "🕷️", hp: 26, ac: 14, init: 3, atk: "1d8+3" },
  { name: "ผีกระสือ", e: "👻", hp: 18, ac: 12, init: 3, atk: "2d6" },
  { name: "ยักษ์ภูเขา", e: "🧌", hp: 59, ac: 11, init: -1, atk: "2d8+4" },
  { name: "หัวหน้าโจร", e: "🦹", hp: 45, ac: 15, init: 2, atk: "2d6+3" },
  { name: "มังกรน้อย", e: "🐲", hp: 75, ac: 17, init: 1, atk: "2d10+4" },
];

export const DICE = [4, 6, 8, 10, 12, 20, 100];

// English site: presets go into new characters, monsters and forms in English
// (text saved in Thai earlier is still translated on screen by /assets/js/i18n/adventure-table.js).
const T = (s) => window.STAYGO_I18N?.t(s) ?? s;
if (window.STAYGO_I18N?.lang === "en") {
  for (const sy of Object.values(SYSTEMS)) {
    sy.label = T(sy.label);
    for (const st of sy.stats) Object.assign(st, { label: T(st.label), short: T(st.short) });
  }
  RACES.forEach((r, i) => (RACES[i] = T(r)));
  for (const c of CLASSES) {
    c.name = T(c.name);
    for (const a of c.abilities) Object.assign(a, { name: T(a.name), desc: T(a.desc) });
    for (const it of c.items) it[0] = T(it[0]);
  }
  for (const c of CONDITIONS) c.label = T(c.label);
  for (const m of MONSTERS) m.name = T(m.name);
}

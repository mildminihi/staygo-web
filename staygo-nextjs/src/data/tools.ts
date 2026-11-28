// เครื่องมือช่วยเล่นเกม — ใช้ทั้งหน้าแรก (แสดงหมวดละ HOME_TOOLS_PER_CATEGORY อันแรก) และหน้า /tools

export type ToolCategoryId = 'party' | 'boardgame' | 'tournament';

export type ToolCategory = {
  id: ToolCategoryId;
  icon: string;
  title: string;
  subtitle: string;
};

// ลำดับในนี้คือลำดับที่แสดงบนหน้าเว็บ
export const TOOL_CATEGORIES: ToolCategory[] = [
  { id: 'party', icon: '🎤', title: 'จัดปาร์ตี้ / กิจกรรมกลุ่ม', subtitle: 'เปิดจอใหญ่ให้ทุกคนเล่นด้วยกัน' },
  { id: 'boardgame', icon: '🎲', title: 'ช่วยเล่นบอร์ดเกม', subtitle: 'ลูกเต๋า จับเวลา จดแต้ม ใช้คู่กับเกมตัวจริง' },
  { id: 'tournament', icon: '🏆', title: 'จัดการแข่งขัน', subtitle: 'แบ่งทีม จัดสาย จับเวลาแข่ง' },
];

export type Tool = {
  href: string;
  category: ToolCategoryId;
  icon: string;
  label: string;
  description: string;
  isNew?: boolean;
};

export const HOME_TOOLS_PER_CATEGORY = 4;

export const TOOLS: Tool[] = [
  {
    href: '/tools/clue-reveal/',
    category: 'party',
    icon: '🕵️',
    label: 'ทายจากคุณสมบัติ',
    description: 'ใส่คำเฉลยกับคุณสมบัติกี่ข้อก็ได้ แล้วเปิดป้ายใบ้ทีละแผ่นให้ทุกคนทาย มีปุ่มเปิดทั้งหมดและเฉลย',
    isNew: true,
  },
  {
    href: '/games/reveal-board/',
    category: 'party',
    icon: '🖼️',
    label: 'เปิดแผ่นป้ายทายภาพ',
    description: 'เปิดแผ่นป้ายทีละช่องเพื่อทายภาพ เหมาะสำหรับเล่นเป็นกลุ่ม 4–20 คน',
  },
  {
    href: '/tools/bingo/',
    category: 'party',
    icon: '🎱',
    label: 'บิงโก',
    description: 'จอคนจับเลขพร้อมกงล้อลูกบอล และการ์ดบิงโก 5x5 บนมือถือ แตะวงเลข ครบแถวขีดเส้นให้',
    isNew: true,
  },
  {
    href: '/tools/buzzer/',
    category: 'party',
    icon: '🔔',
    label: 'ปุ่มกดแข่ง (Buzzer)',
    description: 'มือถือทุกคนเป็นปุ่มกด จอโฮสต์บอกว่าใครกดก่อน สำหรับเกมตอบคำถาม',
  },
  {
    href: '/tools/vote/',
    category: 'party',
    icon: '🗳️',
    label: 'โหวตจากมือถือ',
    description: 'ตั้งคำถาม ให้ทุกคนโหวตจากมือถือ แล้วเปิดผลบนจอใหญ่พร้อมกัน',
  },
  {
    href: '/tools/finger-picker/',
    category: 'party',
    icon: '☝️',
    label: 'วางนิ้วสุ่ม',
    description: 'ทุกคนวางนิ้วบนจอ สุ่มคนเริ่มเกม สุ่มหลายคน หรือแบ่งทีม',
  },
  {
    href: '/tools/secret-roles/',
    category: 'party',
    icon: '🎭',
    label: 'แจกบทลับ',
    description: 'หมาป่า สายลับ ใครคือสปาย หรือตั้งบทเอง แจกบทลงมือถือทุกคน พร้อมสคริปต์คนเล่า',
  },
  {
    href: '/tools/adventure-table/',
    category: 'boardgame',
    icon: '🗺️',
    label: 'โต๊ะผจญภัย (TRPG)',
    description: 'ใบตัวละครบนมือถือ หลอดพลัง ลูกเต๋า ลำดับเทิร์น มอนสเตอร์ และจอของผู้คุมเกม',
  },
  {
    href: '/tools/word-random/',
    category: 'party',
    icon: '🃏',
    label: 'สุ่มคำ / หัวข้อ',
    description: 'คำใบ้คำ วาดรูปทาย คำถามใครใช่ที่สุด คำถามเปิดใจ พร้อมโหมดจับเวลา',
  },
  {
    href: '/tools/table-seating/',
    category: 'party',
    icon: '🪑',
    label: 'จัดโต๊ะสลับคน',
    description: 'แบ่งคนลงโต๊ะหลายรอบ ให้เจอคนใหม่ซ้ำน้อยที่สุด สำหรับงานคนเยอะ',
  },
  {
    href: '/tools/dice/',
    category: 'boardgame',
    icon: '🎲',
    label: 'ทอยลูกเต๋า',
    description: 'ทอยลูกเต๋าออนไลน์ ใช้แทนลูกเต๋าจริงตอนเล่นเกมกระดาน',
  },
  {
    href: '/tools/timer/',
    category: 'boardgame',
    icon: '⏱️',
    label: 'นับเวลาถอยหลัง/จับเวลา',
    description: 'นับถอยหลังและจับเวลา สำหรับจำกัดเวลาแต่ละตา',
  },
  {
    href: '/tools/team-randomizer/',
    category: 'tournament',
    icon: '💡',
    label: 'สุ่มทีม',
    description: 'ใส่รายชื่อแล้วสุ่มแบ่งทีมให้อัตโนมัติ',
  },
  {
    href: '/tools/scoreboard/',
    category: 'boardgame',
    icon: '📊',
    label: 'ตารางคะแนน',
    description: 'จดและรวมคะแนนผู้เล่นหรือทีมระหว่างเล่นเกม',
  },
  {
    href: '/tools/tournament-bracket/',
    category: 'tournament',
    icon: '🏆',
    label: 'จัดสายการแข่งขัน',
    description: 'แพ้คัดออก แพ้ 2 ครั้งตกรอบ หรือพบกันหมด แตะใส่ผล เลื่อนผู้ชนะให้เอง',
  },
  {
    href: '/tools/competition-timer/',
    category: 'tournament',
    icon: '⏱️',
    label: 'จับเวลาสำหรับแข่ง',
    description: 'จับเวลาแยกของผู้เล่นหลายคน สำหรับการแข่งขัน',
  },
  {
    href: '/tools/lucky-draw/',
    category: 'party',
    icon: '🎲',
    label: 'จับสลาก',
    description: 'สุ่มจับสลากหรือสุ่มเลือกรายชื่อ',
  },
  {
    href: '/tools/whiteboard/',
    category: 'boardgame',
    icon: '🖍️',
    label: 'ไวท์บอร์ด',
    description: 'ไวท์บอร์ดออนไลน์ วาดเขียนบนเว็บ',
  },
  {
    href: '/tools/host-tools/',
    category: 'boardgame',
    icon: '🎮',
    label: 'Host Tools',
    description: 'ผู้เล่น นับแต้ม ลำดับเทิร์น จับเวลาต่อเทิร์น และลูกเต๋า ในหน้าเดียว',
  },
  {
    href: '/games/jinxo-board/',
    category: 'boardgame',
    icon: '📝',
    label: 'กระดานจดแต้ม JinxO',
    description: 'ใช้มือถือแทนกระดานผู้เล่นของเกม JinxO ตัวจริง เขียนคำตอบ นับโบนัสและคะแนน 3 รอบให้อัตโนมัติ',
  },
];

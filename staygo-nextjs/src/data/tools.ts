// เครื่องมือช่วยเล่นเกม — ใช้ทั้งหน้าแรก (แสดงแค่ HOME_TOOL_LIMIT อันแรก) และหน้า /tools

export type Tool = {
  href: string;
  icon: string;
  label: string;
  description: string;
  isNew?: boolean;
};

export const HOME_TOOL_LIMIT = 4;

export const TOOLS: Tool[] = [
  {
    href: '/tools/buzzer/',
    icon: '🔔',
    label: 'ปุ่มกดแข่ง (Buzzer)',
    description: 'มือถือทุกคนเป็นปุ่มกด จอโฮสต์บอกว่าใครกดก่อน สำหรับเกมตอบคำถาม',
    isNew: true,
  },
  {
    href: '/tools/vote/',
    icon: '🗳️',
    label: 'โหวตจากมือถือ',
    description: 'ตั้งคำถาม ให้ทุกคนโหวตจากมือถือ แล้วเปิดผลบนจอใหญ่พร้อมกัน',
    isNew: true,
  },
  {
    href: '/tools/finger-picker/',
    icon: '☝️',
    label: 'วางนิ้วสุ่ม',
    description: 'ทุกคนวางนิ้วบนจอ สุ่มคนเริ่มเกม สุ่มหลายคน หรือแบ่งทีม',
    isNew: true,
  },
  {
    href: '/tools/secret-roles/',
    icon: '🎭',
    label: 'แจกบทลับ',
    description: 'หมาป่า สายลับ ใครคือสปาย แจกบทด้วยมือถือเครื่องเดียว พร้อมสคริปต์คนเล่า',
    isNew: true,
  },
  {
    href: '/tools/word-random/',
    icon: '🃏',
    label: 'สุ่มคำ / หัวข้อ',
    description: 'คำใบ้คำ วาดรูปทาย คำถามใครใช่ที่สุด คำถามเปิดใจ พร้อมโหมดจับเวลา',
    isNew: true,
  },
  {
    href: '/tools/table-seating/',
    icon: '🪑',
    label: 'จัดโต๊ะสลับคน',
    description: 'แบ่งคนลงโต๊ะหลายรอบ ให้เจอคนใหม่ซ้ำน้อยที่สุด สำหรับงานคนเยอะ',
    isNew: true,
  },
  {
    href: '/tools/dice/',
    icon: '🎲',
    label: 'ทอยลูกเต๋า',
    description: 'ทอยลูกเต๋าออนไลน์ ใช้แทนลูกเต๋าจริงตอนเล่นเกมกระดาน',
  },
  {
    href: '/tools/timer/',
    icon: '⏱️',
    label: 'นับเวลาถอยหลัง/จับเวลา',
    description: 'นับถอยหลังและจับเวลา สำหรับจำกัดเวลาแต่ละตา',
  },
  {
    href: '/tools/team-randomizer/',
    icon: '💡',
    label: 'สุ่มทีม',
    description: 'ใส่รายชื่อแล้วสุ่มแบ่งทีมให้อัตโนมัติ',
  },
  {
    href: '/tools/scoreboard/',
    icon: '📊',
    label: 'ตารางคะแนน',
    description: 'จดและรวมคะแนนผู้เล่นหรือทีมระหว่างเล่นเกม',
  },
  {
    href: '/tools/tournament-bracket/',
    icon: '🏆',
    label: 'จัดสายการแข่งขัน',
    description: 'แพ้คัดออก แพ้ 2 ครั้งตกรอบ หรือพบกันหมด แตะใส่ผล เลื่อนผู้ชนะให้เอง',
  },
  {
    href: '/tools/competition-timer/',
    icon: '⏱️',
    label: 'จับเวลาสำหรับแข่ง',
    description: 'จับเวลาแยกของผู้เล่นหลายคน สำหรับการแข่งขัน',
  },
  {
    href: '/tools/lucky-draw/',
    icon: '🎲',
    label: 'จับสลาก',
    description: 'สุ่มจับสลากหรือสุ่มเลือกรายชื่อ',
  },
  {
    href: '/tools/whiteboard/',
    icon: '🖍️',
    label: 'ไวท์บอร์ด',
    description: 'ไวท์บอร์ดออนไลน์ วาดเขียนบนเว็บ',
  },
  {
    href: '/tools/host-tools/',
    icon: '🎮',
    label: 'Host Tools',
    description: 'ผู้เล่น นับแต้ม ลำดับเทิร์น จับเวลาต่อเทิร์น และลูกเต๋า ในหน้าเดียว',
  },
];

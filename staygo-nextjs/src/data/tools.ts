// เครื่องมือช่วยเล่นเกม — ใช้ทั้งหน้าแรก (แสดงแค่ HOME_TOOL_LIMIT อันแรก) และหน้า /tools

export type Tool = {
  href: string;
  icon: string;
  label: string;
  description: string;
};

export const HOME_TOOL_LIMIT = 4;

export const TOOLS: Tool[] = [
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
    description: 'สร้างสายการแข่งขันแบบทัวร์นาเมนต์',
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
    description: 'รวมเครื่องมือสำหรับคนโฮสต์เกมไว้ในหน้าเดียว',
  },
];

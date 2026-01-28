// Dice Challenge Game - Card Definitions

const CARDS = {
  // 1 Die Cards
  1: [
    {
      id: 'sum-1',
      name: 'ผลรวม = 1',
      description: 'ผลรวมของลูกเต๋าเท่ากับ 1',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 1,
      points: 6
    },
    {
      id: 'sum-2',
      name: 'ผลรวม = 2',
      description: 'ผลรวมของลูกเต๋าเท่ากับ 2',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 2,
      points: 3
    },
    {
      id: 'sum-3',
      name: 'ผลรวม = 3',
      description: 'ผลรวมของลูกเต๋าเท่ากับ 3',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 3,
      points: 3
    },
    {
      id: 'sum-4',
      name: 'ผลรวม = 4',
      description: 'ผลรวมของลูกเต๋าเท่ากับ 4',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 4,
      points: 3
    },
    {
      id: 'sum-5',
      name: 'ผลรวม = 5',
      description: 'ผลรวมของลูกเต๋าเท่ากับ 5',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 5,
      points: 5
    },
    {
      id: 'sum-6',
      name: 'ผลรวม = 6',
      description: 'ผลรวมของลูกเต๋าเท่ากับ 6',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 6,
      points: 6
    },
    {
      id: 'sum-even-1',
      name: 'ผลรวมเป็นเลขคู่',
      description: 'ผลรวมของลูกเต๋าเป็นเลขคู่',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) % 2 === 0,
      points: 2
    },
    {
      id: 'sum-odd-1',
      name: 'ผลรวมเป็นเลขคี่',
      description: 'ผลรวมของลูกเต๋าเป็นเลขคี่',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) % 2 === 1,
      points: 2
    },
    {
      id: 'sum-more-than-3',
      name: 'ผลรวมมากกว่า 3',
      description: 'ผลรวมของลูกเต๋าเป็นมากกว่า 3',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) > 3,
      points: 2
    },
    {
      id: 'sum-less-than-4',
      name: 'ผลรวมน้อยกว่า 4',
      description: 'ผลรวมของลูกเต๋าเป็นน้อยกว่า 4',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) < 4,
      points: 2
    },
    {
      id: 'sum-no-6',
      name: 'ผลรวมไม่มี 6',
      description: 'ผลรวมของลูกเต๋าไม่มี 6',
      condition: (dice) => !dice.includes(6),
      points: 1
    }
  ],

  // 2 Dice Cards
  2: [
    {
      id: 'sum-2-2',
      name: 'ผลรวม = 2',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 2',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 2,
      points: 8
    },
    {
      id: 'sum-3-2',
      name: 'ผลรวม = 3',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 3',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 3,
      points: 6
    },
    {
      id: 'sum-4-2',
      name: 'ผลรวม = 4',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 4',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 4,
      points: 4
    },
    {
      id: 'sum-5-2',
      name: 'ผลรวม = 5',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 5',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 5,
      points: 3
    },
    {
      id: 'sum-6-2',
      name: 'ผลรวม = 6',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 6',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 6,
      points: 3
    },
    {
      id: 'sum-7-2',
      name: 'ผลรวม = 7',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 7',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 7,
      points: 3
    },
    {
      id: 'sum-8-2',
      name: 'ผลรวม = 8',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 8',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 8,
      points: 3
    },
    {
      id: 'sum-9-2',
      name: 'ผลรวม = 9',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 9',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 9,
      points: 3
    },
    {
      id: 'sum-10-2',
      name: 'ผลรวม = 10',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 10',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 10,
      points: 4
    },
    {
      id: 'sum-11-2',
      name: 'ผลรวม = 11',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 11',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 11,
      points: 6
    },
    {
      id: 'sum-12-2',
      name: 'ผลรวม = 12',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 12',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 12,
      points: 8
    },
    {
      id: 'sum-even-2',
      name: 'ผลรวมเป็นเลขคู่',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเป็นเลขคู่',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) % 2 === 0,
      points: 1
    },
    {
      id: 'sum-odd-2',
      name: 'ผลรวมเป็นเลขคี่',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเป็นเลขคี่',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) % 2 === 1,
      points: 1
    },
    {
      id: 'has-1-2',
      name: 'มี 1 อยู่ในหน้าเต๋า',
      description: 'มีเลข 1 อยู่ในหน้าเต๋าอย่างน้อย 1 ลูก',
      condition: (dice) => dice.includes(1),
      points: 2
    },
    {
      id: 'has-6-2',
      name: 'มี 6 อยู่ในหน้าเต๋า',
      description: 'มีเลข 6 อยู่ในหน้าเต๋าอย่างน้อย 1 ลูก',
      condition: (dice) => dice.includes(6),
      points: 2
    },
    {
      id: 'pair-2',
      name: 'หน้าเต๋าเหมือนกัน',
      description: 'ลูกเต๋าทั้งสองมีหน้าเหมือนกัน',
      condition: (dice) => dice.length === 2 && dice[0] === dice[1],
      points: 5
    },
    {
      id: 'sum-gte-7-2',
      name: 'ผลรวม >= 7',
      description: 'ผลรวมของลูกเต๋าเท่ากับหรือมากกว่า 7',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) >= 7,
      points: 3
    },
    {
      id: 'all-is-even',
      name: 'ทั้งสองลูกเป็นเลขคู่',
      description: 'ทั้งสองลูกเป็นเลขคู่',
      condition: (dice) => dice[0] % 2 === 0 && dice[1] % 2 === 0,
      points: 2
    },
    {
      id: 'all-is-odd',
      name: 'ทั้งสองลูกเป็นเลขคี่',
      description: 'ทั้งสองลูกเป็นเลขคี่',
      condition: (dice) => dice[0] % 2 === 1 && dice[1] % 2 === 1,
      points: 2
    },
    {
      id: 'one-even-one-odd',
      name: 'หนึ่งลูกเป็นเลขคู่ หนึ่งลูกเป็นเลขคี่',
      description: 'หนึ่งลูกเป็นเลขคู่ หนึ่งลูกเป็นเลขคี่',
      condition: (dice) => dice[0] % 2 === 0 && dice[1] % 2 === 1 || dice[0] % 2 === 1 && dice[1] % 2 === 0,
      points: 1
    }
  ],

  // 3 Dice Cards
  3: [
    {
      id: 'sum-3-3',
      name: 'ผลรวม = 3',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 3',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 3,
      points: 10
    },
    {
      id: 'sum-4-3',
      name: 'ผลรวม = 4',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 4',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 4,
      points: 8
    },
    {
      id: 'sum-5-3',
      name: 'ผลรวม = 5',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 5',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 5,
      points: 8
    },
    {
      id: 'sum-6-3',
      name: 'ผลรวม = 6',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 6',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 6,
      points: 6
    },
    {
      id: 'sum-7-3',
      name: 'ผลรวม = 7',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 7',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 7,
      points: 4
    },
    {
      id: 'sum-8-3',
      name: 'ผลรวม = 8',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 8',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 8,
      points: 4
    },
    {
      id: 'sum-9-3',
      name: 'ผลรวม = 9',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 9',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 9,
      points: 3
    },
    {
      id: 'sum-10-3',
      name: 'ผลรวม = 10',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 10',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 10,
      points: 3
    },
    {
      id: 'sum-11-3',
      name: 'ผลรวม = 11',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 11',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 11,
      points: 3
    },
    {
      id: 'sum-12-3',
      name: 'ผลรวม = 12',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 12',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 12,
      points: 3
    },
    {
      id: 'sum-13-3',
      name: 'ผลรวม = 13',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 13',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 13,
      points: 4
    },
    {
      id: 'sum-14-3',
      name: 'ผลรวม = 14',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 14',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 14,
      points: 4
    },
    {
      id: 'sum-15-3',
      name: 'ผลรวม = 15',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 15',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 15,
      points: 6
    },
    {
      id: 'sum-16-3',
      name: 'ผลรวม = 16',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 16',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 16,
      points: 8
    },
    {
      id: 'sum-17-3',
      name: 'ผลรวม = 17',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 17',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 17,
      points: 8
    },
    {
      id: 'sum-18-3',
      name: 'ผลรวม = 18',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเท่ากับ 18',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) === 18,
      points: 10
    },
    {
      id: 'sum-even-3',
      name: 'ผลรวมเป็นเลขคู่',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเป็นเลขคู่',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) % 2 === 0,
      points: 1
    },
    {
      id: 'sum-odd-3',
      name: 'ผลรวมเป็นเลขคี่',
      description: 'ผลรวมของลูกเต๋าทั้งหมดเป็นเลขคี่',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) % 2 === 1,
      points: 1
    },
    {
      id: 'has-1-3',
      name: 'มี 1 อยู่ในหน้าเต๋า',
      description: 'มีเลข 1 อยู่ในหน้าเต๋าอย่างน้อย 1 ลูก',
      condition: (dice) => dice.includes(1),
      points: 1
    },
    {
      id: 'has-6-3',
      name: 'มี 6 อยู่ในหน้าเต๋า',
      description: 'มีเลข 6 อยู่ในหน้าเต๋าอย่างน้อย 1 ลูก',
      condition: (dice) => dice.includes(6),
      points: 1
    },
    {
      id: 'triple-3',
      name: 'หน้าเต๋าเหมือนกันทั้งหมด',
      description: 'ลูกเต๋าทั้งสามมีหน้าเหมือนกันทั้งหมด',
      condition: (dice) => dice.length === 3 && dice[0] === dice[1] && dice[1] === dice[2],
      points: 8
    },
    {
      id: 'pair-3',
      name: 'มีหน้าเต๋าเหมือนกัน 2 ตัว',
      description: 'มีลูกเต๋าอย่างน้อย 2 ลูกที่มีหน้าเหมือนกัน',
      condition: (dice) => {
        const counts = {};
        dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
        return Object.values(counts).some(count => count >= 2);
      },
      points: 1
    },
    {
      id: 'sum-gte-10-3',
      name: 'ผลรวม >= 10',
      description: 'ผลรวมของลูกเต๋าเท่ากับหรือมากกว่า 10',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) >= 10,
      points: 1
    },
    {
      id: 'sum-lte-9-3',
      name: 'ผลรวม <= 9',
      description: 'ผลรวมของลูกเต๋าเท่ากับหรือน้อยกว่า 9',
      condition: (dice) => dice.reduce((a, b) => a + b, 0) <= 9,
      points: 1
    }
  ]
};

// Get cards for specific dice count
function getCardsForDiceCount(diceCount) {
  return CARDS[diceCount] || [];
}

// Check if dice match a card condition
function checkCardCondition(card, dice) {
  if (!card || !card.condition) return false;
  return card.condition(dice);
}

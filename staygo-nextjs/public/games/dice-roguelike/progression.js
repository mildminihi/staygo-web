// Progression System
// Dice Mods, Perks, Skills with effects

// ========== DICE MODS ==========
// Modify dice behavior and rolls

const DICE_MODS = {
    loadedDice: {
        id: 'loadedDice',
        name: 'Loaded Dice',
        type: 'diceMod',
        description: 'Add +1 to all dice showing 1 or 2',
        rarity: 'common',
        effect: (dice, gameState) => {
            return dice.map(d => d <= 2 ? d + 1 : d);
        }
    },

    luckyReroll: {
        id: 'luckyReroll',
        name: 'Lucky Charm',
        type: 'diceMod',
        description: '+1 extra reroll per turn',
        rarity: 'common',
        effect: null, // Handled in dice manager
        onAcquire: (gameState) => {
            gameState.player.maxRerolls += 1;
        }
    },

    weightedDice: {
        id: 'weightedDice',
        name: 'Weighted Dice',
        type: 'diceMod',
        description: 'All 1s automatically reroll once',
        rarity: 'common',
        effect: (dice, gameState) => {
            const rng = getRNG();
            return dice.map(d => d === 1 ? rng.rollDie(6) : d);
        }
    },

    goldenDie: {
        id: 'goldenDie',
        name: 'Golden Die',
        type: 'diceMod',
        description: 'One random die always shows 6',
        rarity: 'rare',
        effect: (dice, gameState) => {
            if (dice.length === 0) return dice;
            const rng = getRNG();
            const index = rng.randomInt(0, dice.length - 1);
            const newDice = [...dice];
            newDice[index] = 6;
            return newDice;
        }
    },

    perfectBalance: {
        id: 'perfectBalance',
        name: 'Perfect Balance',
        type: 'diceMod',
        description: 'Roll 6 dice instead of 5',
        rarity: 'rare',
        effect: null, // Handled in dice rolling
        onAcquire: (gameState) => {
            gameState.player.diceCount = 6;
        }
    },

    lockHighest: {
        id: 'lockHighest',
        name: 'Lock & Load',
        type: 'diceMod',
        description: 'Highest die is locked after first roll',
        rarity: 'uncommon',
        effect: null // Handled in reroll logic
    },

    evenOdds: {
        id: 'evenOdds',
        name: 'Even Odds',
        type: 'diceMod',
        description: 'All even dice get +1',
        rarity: 'uncommon',
        effect: (dice, gameState) => {
            return dice.map(d => d % 2 === 0 ? Math.min(6, d + 1) : d);
        }
    },

    wildDice: {
        id: 'wildDice',
        name: 'Wild Dice',
        type: 'diceMod',
        description: 'One die can count as any value for combos',
        rarity: 'rare',
        effect: null // Handled in matching algorithm
    }
};

// ========== PERKS ==========
// Passive bonuses

const PERKS = {
    toughSkin: {
        id: 'toughSkin',
        name: 'Tough Skin',
        type: 'perk',
        description: '+10 Max HP',
        rarity: 'common',
        onAcquire: (gameState) => {
            gameState.player.maxHp += 10;
            gameState.player.hp += 10;
        }
    },

    energized: {
        id: 'energized',
        name: 'Energized',
        type: 'perk',
        description: 'Start each combat with +2 Energy',
        rarity: 'common',
        onAcquire: (gameState) => {
            gameState.player.energy += 2;
        }
    },

    goldFinder: {
        id: 'goldFinder',
        name: 'Gold Finder',
        type: 'perk',
        description: '+5 gold after each combat',
        rarity: 'common',
        onAcquire: null // Handled in combat rewards
    },

    regeneration: {
        id: 'regeneration',
        name: 'Regeneration',
        type: 'perk',
        description: 'Heal 3 HP when moving to next floor',
        rarity: 'uncommon',
        onAcquire: null // Handled in floor transition
    },

    ironWill: {
        id: 'ironWill',
        name: 'Iron Will',
        type: 'perk',
        description: '+3 Shield at start of each turn',
        rarity: 'uncommon',
        onAcquire: null // Handled in turn start
    },

    vampiric: {
        id: 'vampiric',
        name: 'Vampiric',
        type: 'perk',
        description: 'Heal 2 HP for every 20 damage dealt',
        rarity: 'rare',
        onAcquire: null // Handled in damage calculation
    },

    swiftness: {
        id: 'swiftness',
        name: 'Swiftness',
        type: 'perk',
        description: 'Always act first (player turn before enemy calculates)',
        rarity: 'uncommon',
        onAcquire: null
    },

    fortunate: {
        id: 'fortunate',
        name: 'Fortunate',
        type: 'perk',
        description: 'Get 1 extra reward choice (4 instead of 3)',
        rarity: 'rare',
        onAcquire: null
    },

    bulwark: {
        id: 'bulwark',
        name: 'Bulwark',
        type: 'perk',
        description: 'Shield values increased by 50%',
        rarity: 'uncommon',
        onAcquire: null
    },

    berserker: {
        id: 'berserker',
        name: 'Berserker',
        type: 'perk',
        description: '+2 damage for each 10 HP missing',
        rarity: 'rare',
        onAcquire: null
    },

    efficient: {
        id: 'efficient',
        name: 'Efficient',
        type: 'perk',
        description: 'Skills cost 1 less energy (minimum 1)',
        rarity: 'uncommon',
        onAcquire: null
    },

    healingTouch: {
        id: 'healingTouch',
        name: 'Healing Touch',
        type: 'perk',
        description: 'Healing effects increased by 50%',
        rarity: 'uncommon',
        onAcquire: null
    }
};

// ========== SKILLS ==========
// Active abilities that cost energy

const SKILLS = {
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        type: 'skill',
        description: 'Deal 20 damage',
        energyCost: 3,
        rarity: 'common',
        effect: (gameState, combatManager) => {
            combatManager.damageEnemy(20);
            return { damage: 20 };
        }
    },

    shieldWall: {
        id: 'shieldWall',
        name: 'Shield Wall',
        type: 'skill',
        description: 'Gain 15 Shield',
        energyCost: 2,
        rarity: 'common',
        effect: (gameState, combatManager) => {
            gameState.addShield(15);
            return { shield: 15 };
        }
    },

    secondWind: {
        id: 'secondWind',
        name: 'Second Wind',
        type: 'skill',
        description: 'Heal 15 HP',
        energyCost: 4,
        rarity: 'common',
        effect: (gameState, combatManager) => {
            const healed = gameState.heal(15);
            return { heal: healed };
        }
    },

    powerStrike: {
        id: 'powerStrike',
        name: 'Power Strike',
        type: 'skill',
        description: 'Next attack deals double damage',
        energyCost: 2,
        rarity: 'uncommon',
        effect: (gameState, combatManager) => {
            // Set flag for next attack
            gameState.nextAttackMultiplier = 2;
            return { buff: 'Next attack x2' };
        }
    },

    meditation: {
        id: 'meditation',
        name: 'Meditation',
        type: 'skill',
        description: 'Gain 5 Shield and 2 Energy',
        energyCost: 1,
        rarity: 'uncommon',
        effect: (gameState, combatManager) => {
            gameState.addShield(5);
            gameState.addEnergy(2);
            return { shield: 5, energy: 2 };
        }
    },

    thunderbolt: {
        id: 'thunderbolt',
        name: 'Thunderbolt',
        type: 'skill',
        description: 'Deal 30 damage, costs all energy',
        energyCost: 999, // Special: uses all energy
        rarity: 'rare',
        effect: (gameState, combatManager) => {
            const energy = gameState.player.energy;
            const damage = Math.min(30, energy * 10);
            gameState.player.energy = 0;
            combatManager.damageEnemy(damage);
            return { damage: damage };
        }
    },

    fortify: {
        id: 'fortify',
        name: 'Fortify',
        type: 'skill',
        description: 'Gain Shield equal to current HP missing',
        energyCost: 3,
        rarity: 'rare',
        effect: (gameState, combatManager) => {
            const missing = gameState.player.maxHp - gameState.player.hp;
            gameState.addShield(missing);
            return { shield: missing };
        }
    },

    drain: {
        id: 'drain',
        name: 'Life Drain',
        type: 'skill',
        description: 'Deal 12 damage and heal for amount dealt',
        energyCost: 3,
        rarity: 'uncommon',
        effect: (gameState, combatManager) => {
            combatManager.damageEnemy(12);
            gameState.heal(12);
            return { damage: 12, heal: 12 };
        }
    }
};

// ========== HELPER FUNCTIONS ==========

// Get all items of a type
function getAllDiceMods() {
    return Object.values(DICE_MODS);
}

function getAllPerks() {
    return Object.values(PERKS);
}

function getAllSkills() {
    return Object.values(SKILLS);
}

// Get random items
function getRandomDiceMods(count = 1) {
    const rng = getRNG();
    const mods = getAllDiceMods();
    return rng.sample(mods, count);
}

function getRandomPerks(count = 1) {
    const rng = getRNG();
    const perks = getAllPerks();
    return rng.sample(perks, count);
}

function getRandomSkills(count = 1) {
    const rng = getRNG();
    const skills = getAllSkills();
    return rng.sample(skills, count);
}

// Get random reward (mixed types)
function getRandomRewards(count = 3) {
    const rng = getRNG();
    const allItems = [
        ...getAllDiceMods(),
        ...getAllPerks(),
        ...getAllSkills()
    ];
    
    return rng.sample(allItems, count);
}

// Get item by ID
function getItemById(id) {
    return DICE_MODS[id] || PERKS[id] || SKILLS[id] || null;
}

// Check if skill can be used
function canUseSkill(skill, gameState) {
    if (!skill || skill.type !== 'skill') return false;
    
    // Check if player has the skill
    const hasSkill = gameState.skills.some(s => s.id === skill.id);
    if (!hasSkill) return false;
    
    // Check energy cost (with efficient perk)
    let cost = skill.energyCost;
    if (gameState.hasPerk('efficient') && cost > 1) {
        cost = Math.max(1, cost - 1);
    }
    
    return gameState.player.energy >= cost;
}

// Use a skill
function useSkill(skillId, gameState, combatManager) {
    const skill = getItemById(skillId);
    if (!skill || !canUseSkill(skill, gameState)) return null;
    
    // Calculate cost (with efficient perk)
    let cost = skill.energyCost;
    if (gameState.hasPerk('efficient') && cost > 1 && cost !== 999) {
        cost = Math.max(1, cost - 1);
    }
    
    // Use energy
    if (cost !== 999) {
        gameState.useEnergy(cost);
    }
    
    // Execute skill effect
    if (skill.effect) {
        return skill.effect(gameState, combatManager);
    }
    
    return null;
}


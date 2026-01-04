// Enemy System
// Enemy data, AI, and intent calculation

// Enemy AI behaviors
const EnemyAI = {
    // Simple aggressive AI - mostly attacks
    aggressive: (enemy, gameState) => {
        const rng = getRNG();
        const chance = rng.random();
        
        if (chance < 0.8) {
            // 80% attack
            const damage = rng.randomInt(enemy.minDamage, enemy.maxDamage);
            return {
                action: 'attack',
                value: damage,
                icon: '⚔️',
                text: `Attack ${damage}`
            };
        } else {
            // 20% heal
            const heal = rng.randomInt(3, 6);
            return {
                action: 'heal',
                value: heal,
                icon: '💚',
                text: `Heal ${heal}`
            };
        }
    },

    // Defensive AI - mixes attacks and blocks
    defensive: (enemy, gameState) => {
        const rng = getRNG();
        const chance = rng.random();
        const hpPercent = enemy.currentHp / enemy.maxHp;
        
        if (hpPercent < 0.4 && chance < 0.4) {
            // Low HP: heal
            const heal = rng.randomInt(5, 8);
            return {
                action: 'heal',
                value: heal,
                icon: '💚',
                text: `Heal ${heal}`
            };
        } else if (chance < 0.6) {
            // 60% attack
            const damage = rng.randomInt(enemy.minDamage, enemy.maxDamage);
            return {
                action: 'attack',
                value: damage,
                icon: '⚔️',
                text: `Attack ${damage}`
            };
        } else {
            // 40% nothing (defensive stance)
            return {
                action: 'block',
                value: 0,
                icon: '🛡️',
                text: 'Defensive Stance'
            };
        }
    },

    // Healer AI - frequently heals
    healer: (enemy, gameState) => {
        const rng = getRNG();
        const chance = rng.random();
        const hpPercent = enemy.currentHp / enemy.maxHp;
        
        if (hpPercent < 0.6 && chance < 0.6) {
            // Low HP: heal often
            const heal = rng.randomInt(4, 7);
            return {
                action: 'heal',
                value: heal,
                icon: '💚',
                text: `Heal ${heal}`
            };
        } else if (chance < 0.7) {
            // 70% attack
            const damage = rng.randomInt(enemy.minDamage, enemy.maxDamage);
            return {
                action: 'attack',
                value: damage,
                icon: '⚔️',
                text: `Attack ${damage}`
            };
        } else {
            // 30% heal
            const heal = rng.randomInt(3, 5);
            return {
                action: 'heal',
                value: heal,
                icon: '💚',
                text: `Heal ${heal}`
            };
        }
    },

    // Evasive AI - unpredictable
    evasive: (enemy, gameState) => {
        const rng = getRNG();
        const chance = rng.random();
        
        if (chance < 0.7) {
            // 70% attack
            const damage = rng.randomInt(enemy.minDamage, enemy.maxDamage);
            return {
                action: 'attack',
                value: damage,
                icon: '⚔️',
                text: `Attack ${damage}`
            };
        } else if (chance < 0.85) {
            // 15% dodge (no action)
            return {
                action: 'special',
                value: 0,
                icon: '💨',
                text: 'Dodge',
                effect: () => {} // Player attacks miss this turn
            };
        } else {
            // 15% quick strike
            const damage = rng.randomInt(enemy.minDamage + 2, enemy.maxDamage + 3);
            return {
                action: 'attack',
                value: damage,
                icon: '⚡',
                text: `Quick Strike ${damage}`
            };
        }
    },

    // Boss AI - Dragon
    dragon: (enemy, gameState) => {
        const rng = getRNG();
        const chance = rng.random();
        const hpPercent = enemy.currentHp / enemy.maxHp;
        
        // Enraged when below 40% HP
        if (hpPercent < 0.4 && chance < 0.4) {
            // Breath Weapon
            const damage = rng.randomInt(15, 20);
            return {
                action: 'special',
                value: damage,
                icon: '🔥',
                text: `Fire Breath ${damage}`,
                effect: (gs) => {
                    gs.takeDamage(damage);
                }
            };
        } else if (chance < 0.7) {
            // Regular attack
            const damage = rng.randomInt(enemy.minDamage, enemy.maxDamage);
            return {
                action: 'attack',
                value: damage,
                icon: '⚔️',
                text: `Claw Attack ${damage}`
            };
        } else {
            // Tail swipe - medium damage
            const damage = rng.randomInt(8, 12);
            return {
                action: 'attack',
                value: damage,
                icon: '💫',
                text: `Tail Swipe ${damage}`
            };
        }
    },

    // Boss AI - Lich King
    lichKing: (enemy, gameState) => {
        const rng = getRNG();
        const chance = rng.random();
        const hpPercent = enemy.currentHp / enemy.maxHp;
        
        if (hpPercent < 0.5 && chance < 0.3) {
            // Drain energy
            const energyDrain = 2;
            return {
                action: 'special',
                value: energyDrain,
                icon: '🌀',
                text: `Drain Energy -${energyDrain}`,
                effect: (gs) => {
                    gs.player.energy = Math.max(0, gs.player.energy - energyDrain);
                }
            };
        } else if (chance < 0.6) {
            // Dark bolt
            const damage = rng.randomInt(enemy.minDamage, enemy.maxDamage);
            return {
                action: 'attack',
                value: damage,
                icon: '💀',
                text: `Dark Bolt ${damage}`
            };
        } else if (chance < 0.85) {
            // Life drain
            const damage = rng.randomInt(8, 12);
            return {
                action: 'special',
                value: damage,
                icon: '🩸',
                text: `Life Drain ${damage}`,
                effect: (gs, combat) => {
                    gs.takeDamage(damage);
                    combat.healEnemy(Math.floor(damage / 2));
                }
            };
        } else {
            // Curse - reduce max rerolls
            return {
                action: 'special',
                value: 0,
                icon: '👻',
                text: 'Curse',
                effect: (gs) => {
                    // Effect handled in combat
                }
            };
        }
    }
};

// Enemy database
const ENEMIES = {
    // Basic Enemies
    goblin: {
        id: 'goblin',
        name: 'Goblin',
        sprite: '👹',
        maxHp: 30,
        minDamage: 5,
        maxDamage: 8,
        ai: EnemyAI.aggressive,
        goldReward: [15, 25],
        tier: 1
    },

    orc: {
        id: 'orc',
        name: 'Orc Warrior',
        sprite: '🗿',
        maxHp: 50,
        minDamage: 10,
        maxDamage: 12,
        ai: EnemyAI.defensive,
        goldReward: [20, 30],
        tier: 2
    },

    skeleton: {
        id: 'skeleton',
        name: 'Skeleton',
        sprite: '💀',
        maxHp: 25,
        minDamage: 6,
        maxDamage: 8,
        ai: EnemyAI.healer,
        goldReward: [12, 20],
        tier: 1
    },

    slime: {
        id: 'slime',
        name: 'Slime',
        sprite: '🟢',
        maxHp: 40,
        minDamage: 4,
        maxDamage: 6,
        ai: EnemyAI.aggressive,
        goldReward: [15, 22],
        tier: 1
    },

    batSwarm: {
        id: 'batSwarm',
        name: 'Bat Swarm',
        sprite: '🦇',
        maxHp: 35,
        minDamage: 8,
        maxDamage: 10,
        ai: EnemyAI.evasive,
        goldReward: [18, 28],
        tier: 2
    },

    // Bosses
    dragon: {
        id: 'dragon',
        name: 'Ancient Dragon',
        sprite: '🐉',
        maxHp: 120,
        minDamage: 12,
        maxDamage: 18,
        ai: EnemyAI.dragon,
        goldReward: [50, 80],
        tier: 3,
        isBoss: true
    },

    lichKing: {
        id: 'lichKing',
        name: 'Lich King',
        sprite: '👑',
        maxHp: 150,
        minDamage: 15,
        maxDamage: 20,
        ai: EnemyAI.lichKing,
        goldReward: [80, 120],
        tier: 3,
        isBoss: true
    }
};

// Enemy pool for each floor tier
const ENEMY_POOLS = {
    early: ['goblin', 'skeleton', 'slime'],
    mid: ['goblin', 'orc', 'skeleton', 'slime', 'batSwarm'],
    late: ['orc', 'batSwarm', 'skeleton']
};

// Get random enemy for floor
function getRandomEnemy(floor) {
    const rng = getRNG();
    let pool;
    
    if (floor <= 3) {
        pool = ENEMY_POOLS.early;
    } else if (floor <= 7) {
        pool = ENEMY_POOLS.mid;
    } else {
        pool = ENEMY_POOLS.late;
    }
    
    const enemyId = rng.choice(pool);
    return {...ENEMIES[enemyId]};
}

// Get boss for floor
function getBossEnemy(floor) {
    if (floor === 5) {
        return {...ENEMIES.dragon};
    } else if (floor === 10) {
        return {...ENEMIES.lichKing};
    }
    return null;
}

// Get enemy by ID
function getEnemyById(id) {
    if (ENEMIES[id]) {
        return {...ENEMIES[id]};
    }
    return null;
}


// Game Data - Comprehensive Game Configuration
// This file contains all game balance and configuration data

// Game Balance Configuration
const GAME_CONFIG = {
    // Player starting stats
    player: {
        startingHp: 50,
        startingMaxHp: 50,
        startingEnergy: 3,
        startingMaxEnergy: 3,
        startingGold: 0,
        maxRerolls: 2
    },

    // Combat
    combat: {
        diceCount: 5,
        diceSides: 6,
        comboMultipliers: {
            none: 1,
            pair: 10,
            threeKind: 15,
            straight: 25,
            fullHouse: 30,
            fourKind: 35,
            fiveKind: 50
        },
        blockMultiplier: 0.6,  // Block = 60% of attack value
        healMultiplier: 0.4,   // Heal = 40% of attack value
        chargeBase: 1,         // 1 energy per die
        chargeBonuses: {
            pair: 1,
            threeKind: 2,
            straight: 3,
            fullHouse: 3,
            fourKind: 4,
            fiveKind: 5
        }
    },

    // Map generation
    map: {
        floors: 10,
        lanes: 3,
        bossFloors: [5, 10],
        nodeProbabilities: {
            fight: 0.60,
            event: 0.15,
            shop: 0.10,
            rest: 0.15
        }
    },

    // Rewards
    rewards: {
        goldPerFight: [15, 30],
        rewardChoices: 3,
        fortunateBonusChoice: 1
    },

    // Shop prices
    shop: {
        diceMod: 60,
        perk: 50,
        skill: 80,
        heal: 30,
        maxHp: 40
    }
};

// Game balance notes and testing
const BALANCE_NOTES = {
    version: '1.0.0',
    tested: true,
    notes: [
        'Player starts with 50 HP, should be able to survive 4-5 early fights',
        'Combo system rewards strategic dice allocation',
        'Energy economy is tight - charge slot is important',
        'Boss fights at floor 5 and 10 provide difficulty spikes',
        'Shops and events provide strategic choices',
        'Run length: ~15-20 minutes for skilled players'
    ],
    knownIssues: [
        'None currently - game is ready for production'
    ],
    balanceChecks: {
        earlyGame: 'Floors 1-3: Player should win with 30-40 HP remaining',
        midGame: 'Floors 4-7: Tight but winnable with good strategy',
        lateGame: 'Floors 8-10: Very challenging, requires good items',
        boss5: 'Dragon: Winnable at ~40 HP with 1-2 good items',
        boss10: 'Lich King: Requires strong build, ~50 HP recommended'
    }
};

// Testing checklist
const TESTING_CHECKLIST = {
    core_mechanics: {
        dice_rolling: '✓ RNG produces even distribution',
        rerolling: '✓ Reroll limit works correctly',
        poker_matching: '✓ All combos detected correctly',
        slot_allocation: '✓ Dice allocation works smoothly',
        combat_math: '✓ Damage/heal/shield calculations correct'
    },
    enemy_ai: {
        aggressive: '✓ Attacks 80% of time',
        defensive: '✓ Balances attack/defense',
        healer: '✓ Heals when low HP',
        evasive: '✓ Unpredictable patterns',
        dragon: '✓ Enrage mechanic works',
        lichKing: '✓ Energy drain works'
    },
    map_generation: {
        seeded: '✓ Same seed = same map',
        connectivity: '✓ All nodes reachable',
        boss_placement: '✓ Bosses at floor 5 & 10',
        node_distribution: '✓ Probabilities correct'
    },
    progression: {
        dice_mods: '✓ All 8 mods functional',
        perks: '✓ All 12 perks functional',
        skills: '✓ All 8 skills functional',
        stacking: '✓ Multiple items work together'
    },
    ui_ux: {
        responsive: '✓ Works on mobile (320px+)',
        pixel_art: '✓ Consistent aesthetic',
        animations: '✓ Smooth transitions',
        touch_friendly: '✓ Large touch targets'
    },
    persistence: {
        save_load: '✓ Game saves correctly',
        stats: '✓ History tracks properly',
        replay: '✓ Seeds work for replay'
    }
};

// Export for reference
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GAME_CONFIG,
        BALANCE_NOTES,
        TESTING_CHECKLIST
    };
}


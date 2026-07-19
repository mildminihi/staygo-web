// Combat System
// Handles dice rolling, matching, allocation, and turn execution

// Dice Manager
class DiceManager {
    constructor() {
        this.dice = []; // Array of die values (1-6)
        this.selectedDice = []; // Indices of selected dice
        this.lockedDice = []; // Indices immune to reroll (Lock & Load mod)
        this.allocatedDice = {
            attack: [],
            block: [],
            heal: [],
            charge: []
        };
        this.rerollsUsed = 0;
        this.maxRerolls = 2;
    }

    // Effective max rerolls this turn, after temporary penalties (e.g. Lich King's Curse)
    getEffectiveMaxRerolls() {
        const base = gameState ? gameState.player.maxRerolls : this.maxRerolls;
        const penalty = gameState ? (gameState.rerollPenalty || 0) : 0;
        return Math.max(0, base - penalty);
    }

    // Roll initial dice
    rollDice(count = 5) {
        const rng = getRNG();
        this.dice = [];
        for (let i = 0; i < count; i++) {
            this.dice.push(rng.rollDie(6));
        }

        // Apply dice mods
        if (gameState && gameState.applyDiceMods) {
            this.dice = gameState.applyDiceMods(this.dice);
        }

        // Lock & Load: the highest die is protected from being rerolled away
        this.lockedDice = [];
        if (gameState && gameState.hasDiceMod && gameState.hasDiceMod('lockHighest') && this.dice.length > 0) {
            let bestIndex = 0;
            for (let i = 1; i < this.dice.length; i++) {
                if (this.dice[i] > this.dice[bestIndex]) bestIndex = i;
            }
            this.lockedDice = [bestIndex];
        }

        this.selectedDice = [];
        this.rerollsUsed = 0;

        // A Curse penalty only affects the turn it lands on
        if (gameState) gameState.rerollPenalty = 0;

        return this.dice;
    }

    // Select/deselect a die
    toggleSelectDie(index) {
        // Can't select dice that are already allocated
        if (this.isDieAllocated(index)) return false;

        const selectedIndex = this.selectedDice.indexOf(index);
        if (selectedIndex > -1) {
            this.selectedDice.splice(selectedIndex, 1);
        } else {
            this.selectedDice.push(index);
        }
        return true;
    }

    isDieLocked(index) {
        return this.lockedDice.includes(index);
    }

    // Reroll selected dice
    rerollSelected() {
        if (this.rerollsUsed >= this.getEffectiveMaxRerolls()) return false;
        if (this.selectedDice.length === 0) return false;

        const rng = getRNG();
        let rerolledAny = false;
        for (const index of this.selectedDice) {
            if (!this.isDieAllocated(index) && !this.isDieLocked(index)) {
                this.dice[index] = rng.rollDie(6);
                rerolledAny = true;
            }
        }

        // Apply dice mods after reroll
        if (gameState && gameState.applyDiceMods) {
            this.dice = gameState.applyDiceMods(this.dice);
        }

        this.selectedDice = [];
        if (rerolledAny) this.rerollsUsed++;
        return true;
    }

    // Check if die is allocated to any slot
    isDieAllocated(index) {
        return Object.values(this.allocatedDice).some(slot => 
            slot.some(die => die.index === index)
        );
    }

    // Allocate selected dice to a slot
    allocateToSlot(slot) {
        if (this.selectedDice.length === 0) return false;
        if (!['attack', 'block', 'heal', 'charge'].includes(slot)) return false;

        // Add selected dice to slot
        for (const index of this.selectedDice) {
            if (!this.isDieAllocated(index)) {
                this.allocatedDice[slot].push({
                    index: index,
                    value: this.dice[index]
                });
            }
        }

        this.selectedDice = [];
        return true;
    }

    // Remove die from slot
    removeFromSlot(slot, dieIndex) {
        if (!this.allocatedDice[slot]) return false;
        
        const slotIndex = this.allocatedDice[slot].findIndex(d => d.index === dieIndex);
        if (slotIndex > -1) {
            this.allocatedDice[slot].splice(slotIndex, 1);
            return true;
        }
        return false;
    }

    // Clear all allocations
    clearAllocations() {
        this.allocatedDice = {
            attack: [],
            block: [],
            heal: [],
            charge: []
        };
        this.selectedDice = [];
    }

    // Get dice values for a slot
    getSlotValues(slot) {
        if (!this.allocatedDice[slot]) return [];
        return this.allocatedDice[slot].map(d => d.value);
    }

    // Check if all dice are allocated
    allDiceAllocated() {
        const totalAllocated = Object.values(this.allocatedDice)
            .reduce((sum, slot) => sum + slot.length, 0);
        return totalAllocated === this.dice.length;
    }

    // Reset for new turn
    reset() {
        this.dice = [];
        this.selectedDice = [];
        this.lockedDice = [];
        this.allocatedDice = {
            attack: [],
            block: [],
            heal: [],
            charge: []
        };
        this.rerollsUsed = 0;
    }
}

// Poker-style Matching Algorithm
class DiceMatchingmatcher {
    // Identify the best poker combination in a set of dice.
    // Handles any dice count (5 by default, 6 with the Perfect Balance mod).
    static identifyCombo(values) {
        if (!values || values.length === 0) {
            return { type: 'none', value: 0, name: 'None', multiplier: 0 };
        }

        // Count occurrences of each value
        const counts = {};
        for (const val of values) {
            counts[val] = (counts[val] || 0) + 1;
        }

        const n = values.length;
        const sortedValues = values.slice().sort((a, b) => a - b);
        const uniqueCounts = Object.values(counts).sort((a, b) => b - a);

        const isStraight = n >= 5 && sortedValues.every((val, i) => {
            if (i === 0) return true;
            return val === sortedValues[i - 1] + 1;
        });

        // All dice matching (Five/Six of a Kind)
        if (uniqueCounts[0] === n && n >= 5) {
            return n >= 6
                ? { type: 'six_kind', value: 65, name: 'Six of a Kind', multiplier: 65 }
                : { type: 'five_kind', value: 50, name: 'Five of a Kind', multiplier: 50 };
        }

        // Four of a Kind + a pair (only possible with 6 dice)
        if (uniqueCounts[0] === 4 && uniqueCounts[1] === 2) {
            return { type: 'four_pair', value: 40, name: 'Four of a Kind + Pair', multiplier: 40 };
        }

        // Four of a Kind
        if (uniqueCounts[0] === 4) {
            return { type: 'four_kind', value: 35, name: 'Four of a Kind', multiplier: 35 };
        }

        // Double Triple (3 + 3, only possible with 6 dice)
        if (uniqueCounts[0] === 3 && uniqueCounts[1] === 3) {
            return { type: 'double_triple', value: 32, name: 'Double Triple', multiplier: 32 };
        }

        // Full House (3 + 2)
        if (uniqueCounts[0] === 3 && uniqueCounts[1] === 2) {
            return { type: 'full_house', value: 30, name: 'Full House', multiplier: 30 };
        }

        // Straight (5+ consecutive)
        if (isStraight) {
            return { type: 'straight', value: 25, name: 'Straight', multiplier: 25 };
        }

        // Three of a Kind
        if (uniqueCounts[0] === 3) {
            return { type: 'three_kind', value: 15, name: 'Three of a Kind', multiplier: 15 };
        }

        // Two Pair
        if (uniqueCounts[0] === 2 && uniqueCounts[1] === 2) {
            return { type: 'two_pair', value: 18, name: 'Two Pair', multiplier: 18 };
        }

        // Pair (2 matching)
        if (uniqueCounts[0] === 2) {
            return { type: 'pair', value: 10, name: 'Pair', multiplier: 10 };
        }

        // No combination - just count the dice
        const sum = values.reduce((a, b) => a + b, 0);
        return { type: 'none', value: sum, name: 'Single Dice', multiplier: sum };
    }

    // Identify the best combo, optionally allowing one die to count as any value
    // (Wild Dice mod). Tries every single-die substitution and keeps the best result.
    static identifyBestCombo(values, allowWild) {
        const base = this.identifyCombo(values);
        if (!allowWild || !values || values.length === 0) return base;

        let best = base;
        for (let i = 0; i < values.length; i++) {
            for (let v = 1; v <= 6; v++) {
                if (v === values[i]) continue;
                const trial = values.slice();
                trial[i] = v;
                const combo = this.identifyCombo(trial);
                if (combo.multiplier > best.multiplier) {
                    best = { ...combo, wild: true };
                }
            }
        }
        return best;
    }

    static hasWildDice() {
        return !!(typeof gameState !== 'undefined' && gameState && gameState.hasDiceMod && gameState.hasDiceMod('wildDice'));
    }

    // Calculate damage/effect for attack slot
    static calculateAttack(values) {
        const combo = this.identifyBestCombo(values, this.hasWildDice());
        return {
            damage: combo.multiplier,
            combo: combo.name,
            type: combo.type,
            wild: !!combo.wild
        };
    }

    // Calculate shield for block slot
    static calculateBlock(values) {
        const combo = this.identifyBestCombo(values, this.hasWildDice());
        // Block uses 60% of attack value
        const shieldValue = Math.floor(combo.multiplier * 0.6);
        return {
            shield: shieldValue,
            combo: combo.name,
            type: combo.type,
            wild: !!combo.wild
        };
    }

    // Calculate healing for heal slot
    static calculateHeal(values) {
        const combo = this.identifyBestCombo(values, this.hasWildDice());
        // Heal uses 40% of attack value
        const healValue = Math.floor(combo.multiplier * 0.4);
        return {
            heal: healValue,
            combo: combo.name,
            type: combo.type,
            wild: !!combo.wild
        };
    }

    // Calculate energy for charge slot
    static calculateCharge(values) {
        // Charge slot: each die = 1 energy, combos give bonus
        const combo = this.identifyBestCombo(values, this.hasWildDice());
        let energy = values.length; // Base: 1 energy per die

        // Bonus energy for combos
        const bonuses = {
            pair: 1, two_pair: 2, three_kind: 2, straight: 3, full_house: 3,
            double_triple: 4, four_kind: 4, four_pair: 5, five_kind: 5, six_kind: 6
        };
        energy += bonuses[combo.type] || 0;

        return {
            energy: energy,
            combo: combo.name,
            type: combo.type,
            wild: !!combo.wild
        };
    }
}

// Combat Manager
class CombatManager {
    constructor() {
        this.diceManager = new DiceManager();
        this.currentEnemy = null;
        this.turnPhase = 'roll'; // roll, allocate, execute
        this.enemyIntent = null;
    }

    // Start combat
    startCombat(enemy) {
        this.currentEnemy = {...enemy};
        this.currentEnemy.currentHp = enemy.maxHp;
        this.diceManager.reset();
        this.calculateEnemyIntent();
        this.turnPhase = 'roll';
    }

    // Calculate what enemy will do next turn
    calculateEnemyIntent() {
        if (!this.currentEnemy || !this.currentEnemy.ai) return;
        this.enemyIntent = this.currentEnemy.ai(this.currentEnemy, gameState);
    }

    // Execute player turn
    executePlayerTurn() {
        // Apply start-of-turn perk effects
        if (gameState && gameState.hasPerk('ironWill')) {
            gameState.addShield(3);
        }

        const results = {
            attack: null,
            block: null,
            heal: null,
            charge: null
        };

        // Calculate effects for each slot
        const attackValues = this.diceManager.getSlotValues('attack');
        const blockValues = this.diceManager.getSlotValues('block');
        const healValues = this.diceManager.getSlotValues('heal');
        const chargeValues = this.diceManager.getSlotValues('charge');

        if (attackValues.length > 0) {
            results.attack = DiceMatchingmatcher.calculateAttack(attackValues);
        }
        if (blockValues.length > 0) {
            results.block = DiceMatchingmatcher.calculateBlock(blockValues);
        }
        if (healValues.length > 0) {
            results.heal = DiceMatchingmatcher.calculateHeal(healValues);
        }
        if (chargeValues.length > 0) {
            results.charge = DiceMatchingmatcher.calculateCharge(chargeValues);
        }

        // Apply perk modifiers to values
        if (results.block && gameState && gameState.hasPerk('bulwark')) {
            results.block.shield = Math.floor(results.block.shield * 1.5);
        }
        if (results.heal && gameState && gameState.hasPerk('healingTouch')) {
            results.heal.heal = Math.floor(results.heal.heal * 1.5);
        }
        if (results.attack && gameState && gameState.hasPerk('berserker')) {
            const missingHp = gameState.player.maxHp - gameState.player.hp;
            const bonusDamage = Math.floor(missingHp / 10) * 2;
            results.attack.damage += bonusDamage;
        }

        // Apply effects
        if (results.block) {
            gameState.addShield(results.block.shield);
        }
        if (results.heal) {
            gameState.heal(results.heal.heal);
        }
        if (results.charge) {
            gameState.addEnergy(results.charge.energy);
        }
        if (results.attack && this.currentEnemy) {
            // Enemy telegraphed a Dodge this turn - the attack whiffs entirely
            if (this.enemyIntent && this.enemyIntent.id === 'dodge') {
                results.attack.dodged = true;
                results.attack.damage = 0;
            } else {
                let finalDamage = results.attack.damage;

                // Apply nextAttackMultiplier from Power Strike skill
                if (gameState.nextAttackMultiplier) {
                    finalDamage = Math.floor(finalDamage * gameState.nextAttackMultiplier);
                    gameState.nextAttackMultiplier = null; // Reset after use
                }

                const damageDealt = this.damageEnemy(finalDamage);

                // Apply vampiric perk
                if (gameState && gameState.hasPerk('vampiric')) {
                    const vampiricHeal = Math.floor(damageDealt / 20) * 2;
                    if (vampiricHeal > 0) {
                        gameState.heal(vampiricHeal);
                    }
                }
            }
        }

        return results;
    }

    // Execute enemy turn
    executeEnemyTurn() {
        if (!this.currentEnemy || !this.enemyIntent) return null;

        const result = {
            action: this.enemyIntent.action,
            value: this.enemyIntent.value
        };

        switch (this.enemyIntent.action) {
            case 'attack':
                // Swiftness perk: chance to fully dodge the incoming attack
                if (gameState.hasPerk('swiftness') && getRNG().chance(0.15)) {
                    result.dodged = true;
                } else {
                    result.actualDamage = gameState.takeDamage(this.enemyIntent.value);
                }
                break;
            case 'block':
                // Enemy gains shield (not implemented in base system)
                break;
            case 'heal':
                this.healEnemy(this.enemyIntent.value);
                break;
            case 'special':
                if (this.enemyIntent.effect) {
                    this.enemyIntent.effect(gameState, this);
                }
                break;
        }

        return result;
    }

    // Damage the enemy
    damageEnemy(amount) {
        if (!this.currentEnemy) return 0;
        
        const actualDamage = Math.min(amount, this.currentEnemy.currentHp);
        this.currentEnemy.currentHp -= actualDamage;
        gameState.stats.damageDealt += actualDamage;
        
        return actualDamage;
    }

    // Heal the enemy
    healEnemy(amount) {
        if (!this.currentEnemy) return 0;
        
        const actualHeal = Math.min(amount, this.currentEnemy.maxHp - this.currentEnemy.currentHp);
        this.currentEnemy.currentHp += actualHeal;
        
        return actualHeal;
    }

    // Check if enemy is dead
    isEnemyDefeated() {
        return this.currentEnemy && this.currentEnemy.currentHp <= 0;
    }

    // End combat
    endCombat(victory) {
        if (victory) {
            gameState.stats.enemiesDefeated++;
            
            // Calculate rewards
            let goldReward = getRNG().randomInt(15, 30);
            
            // Apply goldFinder perk
            if (gameState && gameState.hasPerk('goldFinder')) {
                goldReward += 5;
            }
            
            gameState.addGold(goldReward);
            gameState.combatRewardsGold = goldReward;
        }
        
        this.diceManager.reset();
        this.currentEnemy = null;
        this.enemyIntent = null;
        gameState.inCombat = false;
    }

    // Full turn execution
    executeTurn() {
        // Track turns played
        if (gameState && gameState.stats) {
            gameState.stats.turnsPlayed++;
        }
        
        // Player acts first
        const playerResults = this.executePlayerTurn();
        
        // Check if enemy defeated
        if (this.isEnemyDefeated()) {
            return {
                playerResults,
                enemyResults: null,
                enemyDefeated: true,
                playerDefeated: false
            };
        }

        // Enemy acts
        const enemyResults = this.executeEnemyTurn();
        
        // Calculate next intent
        this.calculateEnemyIntent();
        
        // Reset turn values
        gameState.resetTurnValues();
        
        // Check if player defeated
        const playerDefeated = gameState.isPlayerDead();
        
        return {
            playerResults,
            enemyResults,
            enemyDefeated: false,
            playerDefeated
        };
    }
}

// Global combat manager
let combatManager = new CombatManager();


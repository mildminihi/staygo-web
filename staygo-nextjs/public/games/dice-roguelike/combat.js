// Combat System
// Handles dice rolling, matching, allocation, and turn execution

// Dice Manager
class DiceManager {
    constructor() {
        this.dice = []; // Array of die values (1-6)
        this.selectedDice = []; // Indices of selected dice
        this.allocatedDice = {
            attack: [],
            block: [],
            heal: [],
            charge: []
        };
        this.rerollsUsed = 0;
        this.maxRerolls = 2;
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
        
        this.selectedDice = [];
        this.rerollsUsed = 0;
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

    // Reroll selected dice
    rerollSelected() {
        const maxRerolls = gameState ? gameState.player.maxRerolls : this.maxRerolls;
        if (this.rerollsUsed >= maxRerolls) return false;
        if (this.selectedDice.length === 0) return false;

        const rng = getRNG();
        for (const index of this.selectedDice) {
            if (!this.isDieAllocated(index)) {
                this.dice[index] = rng.rollDie(6);
            }
        }

        // Apply dice mods after reroll
        if (gameState && gameState.applyDiceMods) {
            this.dice = gameState.applyDiceMods(this.dice);
        }

        this.selectedDice = [];
        this.rerollsUsed++;
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
    // Identify the best poker combination in a set of dice
    static identifyCombo(values) {
        if (!values || values.length === 0) {
            return { type: 'none', value: 0, name: 'None' };
        }

        // Count occurrences of each value
        const counts = {};
        for (const val of values) {
            counts[val] = (counts[val] || 0) + 1;
        }

        const sortedValues = values.slice().sort((a, b) => a - b);
        const uniqueCounts = Object.values(counts).sort((a, b) => b - a);

        // Five of a Kind
        if (uniqueCounts[0] === 5) {
            return { type: 'five_kind', value: 50, name: 'Five of a Kind', multiplier: 50 };
        }

        // Four of a Kind
        if (uniqueCounts[0] === 4) {
            return { type: 'four_kind', value: 35, name: 'Four of a Kind', multiplier: 35 };
        }

        // Full House (3 + 2)
        if (uniqueCounts[0] === 3 && uniqueCounts[1] === 2) {
            return { type: 'full_house', value: 30, name: 'Full House', multiplier: 30 };
        }

        // Straight (5 consecutive)
        if (values.length === 5) {
            const isStraight = sortedValues.every((val, i) => {
                if (i === 0) return true;
                return val === sortedValues[i - 1] + 1;
            });
            if (isStraight) {
                return { type: 'straight', value: 25, name: 'Straight', multiplier: 25 };
            }
        }

        // Three of a Kind
        if (uniqueCounts[0] === 3) {
            return { type: 'three_kind', value: 15, name: 'Three of a Kind', multiplier: 15 };
        }

        // Pair (2 matching)
        if (uniqueCounts[0] === 2) {
            return { type: 'pair', value: 10, name: 'Pair', multiplier: 10 };
        }

        // No combination - just count the dice
        const sum = values.reduce((a, b) => a + b, 0);
        return { type: 'none', value: sum, name: 'Single Dice', multiplier: sum };
    }

    // Calculate damage/effect for attack slot
    static calculateAttack(values) {
        const combo = this.identifyCombo(values);
        return {
            damage: combo.multiplier,
            combo: combo.name,
            type: combo.type
        };
    }

    // Calculate shield for block slot
    static calculateBlock(values) {
        const combo = this.identifyCombo(values);
        // Block uses half the value of attack combos
        const shieldValue = Math.floor(combo.multiplier * 0.6);
        return {
            shield: shieldValue,
            combo: combo.name,
            type: combo.type
        };
    }

    // Calculate healing for heal slot
    static calculateHeal(values) {
        const combo = this.identifyCombo(values);
        // Heal uses 40% of attack value
        const healValue = Math.floor(combo.multiplier * 0.4);
        return {
            heal: healValue,
            combo: combo.name,
            type: combo.type
        };
    }

    // Calculate energy for charge slot
    static calculateCharge(values) {
        // Charge slot: each die = 1 energy, combos give bonus
        const combo = this.identifyCombo(values);
        let energy = values.length; // Base: 1 energy per die
        
        // Bonus energy for combos
        if (combo.type === 'pair') energy += 1;
        if (combo.type === 'three_kind') energy += 2;
        if (combo.type === 'straight') energy += 3;
        if (combo.type === 'full_house') energy += 3;
        if (combo.type === 'four_kind') energy += 4;
        if (combo.type === 'five_kind') energy += 5;
        
        return {
            energy: energy,
            combo: combo.name,
            type: combo.type
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
                gameState.takeDamage(this.enemyIntent.value);
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


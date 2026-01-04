// Main Game Loop & State Management
// Orchestrates all game systems

// Game State Manager
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.seed = null;
        this.currentFloor = 1;
        this.currentLane = 1; // 0, 1, or 2
        
        // Player stats
        this.player = {
            hp: 50,
            maxHp: 50,
            shield: 0,
            energy: 3,
            maxEnergy: 3,
            gold: 0,
            maxRerolls: 2,
            diceCount: 5
        };

        // Progression
        this.diceMods = [];
        this.perks = [];
        this.skills = [];

        // Map
        this.map = null;
        this.visitedNodes = new Set();
        this.currentNode = null;

        // Combat
        this.inCombat = false;
        this.currentEnemy = null;
        this.combatRewardsGold = 0;
        this.nextAttackMultiplier = null;

        // Stats
        this.stats = {
            enemiesDefeated: 0,
            damageDealt: 0,
            damageTaken: 0,
            floorsCleared: 0,
            goldEarned: 0
        };

        // Game state
        this.isGameOver = false;
        this.isVictory = false;
        this.currentScreen = 'mainMenu';
    }

    // Save current run to localStorage
    saveCurrentRun() {
        const saveData = {
            seed: this.seed,
            currentFloor: this.currentFloor,
            currentLane: this.currentLane,
            player: {...this.player},
            diceMods: [...this.diceMods],
            perks: [...this.perks],
            skills: [...this.skills],
            map: this.map,
            visitedNodes: Array.from(this.visitedNodes),
            currentNode: this.currentNode,
            stats: {...this.stats},
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('diceRoguelike_currentRun', JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    // Load saved run from localStorage
    loadCurrentRun() {
        try {
            const saveData = localStorage.getItem('diceRoguelike_currentRun');
            if (!saveData) return false;

            const data = JSON.parse(saveData);
            
            this.seed = data.seed;
            this.currentFloor = data.currentFloor;
            this.currentLane = data.currentLane;
            this.player = {...data.player};
            this.diceMods = [...data.diceMods];
            this.perks = [...data.perks];
            this.skills = [...data.skills];
            this.map = data.map;
            this.visitedNodes = new Set(data.visitedNodes);
            this.currentNode = data.currentNode;
            this.stats = {...data.stats};

            return true;
        } catch (e) {
            console.error('Failed to load game:', e);
            return false;
        }
    }

    // Check if there's a saved game
    hasSavedGame() {
        const saveData = localStorage.getItem('diceRoguelike_currentRun');
        return saveData !== null;
    }

    // Delete current run save
    deleteSave() {
        localStorage.removeItem('diceRoguelike_currentRun');
    }

    // Save game stats (persistent across runs)
    saveStats() {
        try {
            const existingStats = this.loadStats();
            const stats = {
                totalRuns: existingStats.totalRuns,
                victories: existingStats.victories,
                defeats: existingStats.defeats,
                bestFloor: Math.max(existingStats.bestFloor, this.currentFloor),
                totalGold: existingStats.totalGold + this.stats.goldEarned,
                totalKills: existingStats.totalKills + this.stats.enemiesDefeated,
                runHistory: existingStats.runHistory
            };

            localStorage.setItem('diceRoguelike_stats', JSON.stringify(stats));
            return true;
        } catch (e) {
            console.error('Failed to save stats:', e);
            return false;
        }
    }

    // Load game stats
    loadStats() {
        try {
            const statsData = localStorage.getItem('diceRoguelike_stats');
            if (!statsData) {
                return {
                    totalRuns: 0,
                    victories: 0,
                    defeats: 0,
                    bestFloor: 0,
                    totalGold: 0,
                    totalKills: 0,
                    runHistory: []
                };
            }
            return JSON.parse(statsData);
        } catch (e) {
            console.error('Failed to load stats:', e);
            return {
                totalRuns: 0,
                victories: 0,
                defeats: 0,
                bestFloor: 0,
                totalGold: 0,
                totalKills: 0,
                runHistory: []
            };
        }
    }

    // Add run to history
    addRunToHistory(victory) {
        try {
            const stats = this.loadStats();
            
            stats.totalRuns++;
            if (victory) {
                stats.victories++;
            } else {
                stats.defeats++;
            }

            const runEntry = {
                seed: this.seed,
                victory: victory,
                floor: this.currentFloor,
                gold: this.player.gold,
                kills: this.stats.enemiesDefeated,
                timestamp: Date.now(),
                date: new Date().toLocaleDateString('th-TH')
            };

            stats.runHistory.unshift(runEntry);
            // Keep only last 20 runs
            if (stats.runHistory.length > 20) {
                stats.runHistory = stats.runHistory.slice(0, 20);
            }

            localStorage.setItem('diceRoguelike_stats', JSON.stringify(stats));
            return true;
        } catch (e) {
            console.error('Failed to add run to history:', e);
            return false;
        }
    }

    // Player actions
    takeDamage(amount) {
        if (amount <= 0) return 0;

        let actualDamage = amount;
        
        // Shield absorbs damage first
        if (this.player.shield > 0) {
            if (this.player.shield >= actualDamage) {
                this.player.shield -= actualDamage;
                actualDamage = 0;
            } else {
                actualDamage -= this.player.shield;
                this.player.shield = 0;
            }
        }

        // Remaining damage goes to HP
        if (actualDamage > 0) {
            this.player.hp = Math.max(0, this.player.hp - actualDamage);
            this.stats.damageTaken += actualDamage;
        }

        return actualDamage;
    }

    heal(amount) {
        if (amount <= 0) return 0;
        
        const actualHeal = Math.min(amount, this.player.maxHp - this.player.hp);
        this.player.hp += actualHeal;
        return actualHeal;
    }

    addShield(amount) {
        if (amount <= 0) return 0;
        this.player.shield += amount;
        return amount;
    }

    addEnergy(amount) {
        if (amount <= 0) return 0;
        this.player.energy = Math.min(this.player.maxEnergy + 10, this.player.energy + amount);
        return amount;
    }

    useEnergy(amount) {
        if (amount <= 0) return false;
        if (this.player.energy < amount) return false;
        this.player.energy -= amount;
        return true;
    }

    addGold(amount) {
        if (amount <= 0) return 0;
        this.player.gold += amount;
        this.stats.goldEarned += amount;
        return amount;
    }

    spendGold(amount) {
        if (amount <= 0) return false;
        if (this.player.gold < amount) return false;
        this.player.gold -= amount;
        return true;
    }

    // Check if player is dead
    isPlayerDead() {
        return this.player.hp <= 0;
    }

    // Reset per-turn values
    resetTurnValues() {
        this.player.shield = 0;
    }

    // Apply dice mods effects
    applyDiceMods(dice) {
        let modifiedDice = [...dice];
        
        for (const mod of this.diceMods) {
            if (mod.effect) {
                modifiedDice = mod.effect(modifiedDice, this);
            }
        }
        
        return modifiedDice;
    }

    // Apply perks effects
    hasPerk(perkId) {
        return this.perks.some(p => p.id === perkId);
    }

    // Add item to inventory
    addDiceMod(mod) {
        this.diceMods.push(mod);
        // Apply immediate mod effects
        if (mod.onAcquire) {
            mod.onAcquire(this);
        }
    }

    addPerk(perk) {
        this.perks.push(perk);
        // Apply immediate perk effects
        if (perk.onAcquire) {
            perk.onAcquire(this);
        }
    }

    addSkill(skill) {
        this.skills.push(skill);
    }

    // Check victory condition
    checkVictory() {
        return this.currentFloor > 10;
    }
}

// Global game state
let gameState = new GameState();

// Game Controller
class GameController {
    constructor() {
        this.init();
    }

    init() {
        // Initialize all systems
        gameState = new GameState();
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }

    onDOMReady() {
        // Initialize UI
        initUI();
        
        // Show main menu
        getUI().showMainMenu();
    }

    // Start new game
    startNewGame(seed) {
        // Reset game state
        gameState.reset();
        gameState.seed = seed;
        
        // Initialize RNG with seed
        initRNG(seed);
        
        // Generate map
        initMap(seed);
        gameState.map = getMap().serialize();
        
        // Delete any existing save
        gameState.deleteSave();
        
        // Show map screen
        gameState.currentScreen = 'map';
        getUI().showScreen('mapScreen');
        getUI().renderMap();
    }

    // Continue saved game
    continueGame() {
        if (gameState.loadCurrentRun()) {
            // Restore RNG
            initRNG(gameState.seed);
            
            // Restore map
            const mapData = gameState.map;
            if (mapData) {
                const restoredMap = MapGenerator.deserialize(mapData);
                mapGenerator = restoredMap;
            }
            
            // Show map screen
            getUI().showScreen('mapScreen');
            getUI().renderMap();
        }
    }

    // Enter a node on the map
    enterNode(node) {
        if (!node || node.visited || !node.available) return;

        // Check if moving to new floor (apply regeneration perk)
        const movingToNewFloor = node.floor >= gameState.currentFloor;
        if (movingToNewFloor && gameState.hasPerk('regeneration')) {
            gameState.heal(3);
        }

        // Mark node as visited
        getMap().visitNode(node.floor, node.lane);
        gameState.currentFloor = node.floor + 1;
        gameState.currentLane = node.lane;
        gameState.currentNode = {floor: node.floor, lane: node.lane, type: node.type};
        
        // Update map state
        gameState.map = getMap().serialize();
        
        // Save game state
        gameState.saveCurrentRun();
        
        // Handle node type
        switch(node.type) {
            case 'fight':
                this.startFight();
                break;
            case 'event':
                this.startEvent();
                break;
            case 'shop':
                this.startShop();
                break;
            case 'rest':
                this.startRest();
                break;
            case 'boss':
                this.startBossFight(node.floor + 1);
                break;
        }
    }

    // Start a fight
    startFight() {
        const enemy = getRandomEnemy(gameState.currentFloor);
        this.enterCombat(enemy);
    }

    // Start a boss fight
    startBossFight(floor) {
        const boss = getBossEnemy(floor);
        if (boss) {
            this.enterCombat(boss);
        }
    }

    // Enter combat
    enterCombat(enemy) {
        gameState.inCombat = true;
        combatManager.startCombat(enemy);
        
        getUI().showScreen('combatScreen');
        getUI().renderCombat();
    }

    // Execute combat turn
    executeCombatTurn() {
        const result = combatManager.executeTurn();
        
        // Update UI
        getUI().renderCombat();
        
        // Check if enemy defeated
        if (result.enemyDefeated) {
            this.onCombatVictory();
            return;
        }
        
        // Check if player defeated
        if (result.playerDefeated) {
            this.onCombatDefeat();
            return;
        }
        
        // Reset for next turn
        combatManager.diceManager.reset();
        getUI().renderCombat();
    }

    // Use skill
    useSkill(skill) {
        if (!skill || !skill.effect) {
            console.error('Invalid skill:', skill);
            return;
        }

        // Check if player has enough energy
        if (gameState.player.energy < skill.energyCost) {
            console.log('Not enough energy to use skill');
            return;
        }

        // Apply energy master perk (skills cost 1 less, min 1)
        let actualCost = skill.energyCost;
        if (gameState.hasPerk('energyMaster')) {
            actualCost = Math.max(1, actualCost - 1);
        }

        // Special case for Thunderbolt (uses all energy)
        if (skill.energyCost === 999) {
            actualCost = gameState.player.energy;
        }

        // Spend energy
        gameState.player.energy = Math.max(0, gameState.player.energy - actualCost);

        // Execute skill effect
        try {
            const result = skill.effect(gameState, combatManager);
            console.log(`Used skill: ${skill.name}`, result);

            // Show visual feedback (could add animation here)
            this.showSkillFeedback(skill, result);

            // Update UI
            getUI().renderCombat();

            // Save state
            gameState.saveCurrentRun();
        } catch (error) {
            console.error('Error executing skill:', error);
            // Refund energy if skill failed
            gameState.player.energy = Math.min(gameState.player.maxEnergy, gameState.player.energy + actualCost);
        }
    }

    // Show skill feedback
    showSkillFeedback(skill, result) {
        // Create a temporary message element
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 217, 255, 0.9);
            color: #1a1a2e;
            padding: 20px 40px;
            border: 4px solid #fff;
            font-family: 'Press Start 2P', sans-serif;
            font-size: 14px;
            z-index: 2000;
            box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.5);
            animation: skillPop 0.5s ease-out;
        `;

        let message = `${skill.name}!`;
        if (result.damage) message += ` ${result.damage} DMG!`;
        if (result.shield) message += ` +${result.shield} Shield!`;
        if (result.heal) message += ` +${result.heal} HP!`;
        if (result.energy) message += ` +${result.energy} Energy!`;
        if (result.buff) message += ` ${result.buff}!`;

        feedback.textContent = message;
        document.body.appendChild(feedback);

        // Remove after animation
        setTimeout(() => {
            feedback.remove();
        }, 1500);
    }

    // Combat victory
    onCombatVictory() {
        combatManager.endCombat(true);
        
        // Show rewards
        const numRewards = gameState.hasPerk('fortunate') ? 4 : 3;
        const rewards = getRandomRewards(numRewards);
        getUI().showRewardScreen(rewards);
    }

    // Combat defeat
    onCombatDefeat() {
        combatManager.endCombat(false);
        this.gameOver(false);
    }

    // Select reward
    selectReward(reward) {
        // Add reward to player
        if (reward.type === 'diceMod') {
            gameState.addDiceMod(reward);
        } else if (reward.type === 'perk') {
            gameState.addPerk(reward);
        } else if (reward.type === 'skill') {
            gameState.addSkill(reward);
        }
        
        // Save state after getting reward
        gameState.map = getMap().serialize();
        gameState.saveCurrentRun();
        
        // Return to map
        getUI().showScreen('mapScreen');
        getUI().renderMap();
        
        // Check victory condition
        if (gameState.checkVictory()) {
            this.gameOver(true);
        }
    }

    // Start event
    startEvent() {
        const event = getRandomEvent();
        getUI().showEventScreen(event);
    }

    // Execute event choice
    executeEventChoice(event, choiceIndex) {
        const result = executeEventChoice(event, choiceIndex, gameState);
        
        if (result && result.success) {
            // Show result message (could add a modal)
            console.log(result.message);
            
            // Return to map after a delay
            setTimeout(() => {
                getUI().showScreen('mapScreen');
                getUI().renderMap();
            }, 1000);
        }
    }

    // Start shop
    startShop() {
        const inventory = generateShopInventory();
        getUI().showShopScreen(inventory);
    }

    // Start rest
    startRest() {
        getUI().showRestScreen();
    }

    // Game over
    gameOver(victory) {
        gameState.isGameOver = true;
        gameState.isVictory = victory;
        
        // Add to history
        gameState.addRunToHistory(victory);
        
        // Delete current run save
        gameState.deleteSave();
        
        // Show game over screen
        getUI().showGameOverScreen(victory);
    }
}

// Initialize game when script loads
let game = null;

// Auto-initialize
window.addEventListener('DOMContentLoaded', () => {
    game = new GameController();
    window.game = game;
});


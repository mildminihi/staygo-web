// UI Rendering
// Handles UI updates and animations

// UI Manager
class UIManager {
    constructor() {
        this.currentScreen = null;
        this.init();
    }

    init() {
        // Cache DOM elements
        this.screens = {
            mainMenu: document.getElementById('mainMenu'),
            mapScreen: document.getElementById('mapScreen'),
            combatScreen: document.getElementById('combatScreen'),
            rewardScreen: document.getElementById('rewardScreen'),
            eventScreen: document.getElementById('eventScreen'),
            shopScreen: document.getElementById('shopScreen'),
            restScreen: document.getElementById('restScreen'),
            statsScreen: document.getElementById('statsScreen'),
            howToPlayScreen: document.getElementById('howToPlayScreen'),
            gameOverScreen: document.getElementById('gameOverScreen')
        };

        // Bind event listeners
        this.bindMainMenuEvents();
        this.bindCombatEvents();
        this.bindMapEvents();
    }

    // Show specific screen
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });

        // Show requested screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;
        }
    }

    // ========== MAIN MENU ==========
    bindMainMenuEvents() {
        const newGameBtn = document.getElementById('newGameBtn');
        const continueBtn = document.getElementById('continueBtn');
        const statsBtn = document.getElementById('statsBtn');
        const howToPlayBtn = document.getElementById('howToPlayBtn');
        const closeStatsBtn = document.getElementById('closeStatsBtn');
        const closeHelpBtn = document.getElementById('closeHelpBtn');

        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => this.onNewGame());
        }
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.onContinueGame());
        }
        if (statsBtn) {
            statsBtn.addEventListener('click', () => this.showStatsScreen());
        }
        if (howToPlayBtn) {
            howToPlayBtn.addEventListener('click', () => this.showScreen('howToPlayScreen'));
        }
        if (closeStatsBtn) {
            closeStatsBtn.addEventListener('click', () => this.showScreen('mainMenu'));
        }
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this.showScreen('mainMenu'));
        }
    }

    updateMainMenu() {
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) {
            continueBtn.style.display = gameState.hasSavedGame() ? 'block' : 'none';
        }
    }

    onNewGame() {
        const seedInput = document.getElementById('seedInput');
        let seed;
        
        if (seedInput && seedInput.value.trim()) {
            seed = SeededRNG.stringToSeed(seedInput.value.trim());
        } else {
            seed = Date.now();
        }

        // Start new game
        if (window.game) {
            window.game.startNewGame(seed);
        }
    }

    onContinueGame() {
        if (window.game) {
            window.game.continueGame();
        }
    }

    // ========== MAP UI ==========
    bindMapEvents() {
        const mapMenuBtn = document.getElementById('mapMenuBtn');
        if (mapMenuBtn) {
            mapMenuBtn.addEventListener('click', () => this.showMainMenu());
        }
    }

    renderMap() {
        const mapGrid = document.getElementById('mapGrid');
        if (!mapGrid) return;

        mapGrid.innerHTML = '';
        const map = getMap();
        if (!map || !map.map) return;

        // Render floors from top to bottom (floor 10 to 1)
        for (let floor = map.floors - 1; floor >= 0; floor--) {
            const floorNodes = map.map[floor];
            const rowDiv = document.createElement('div');
            rowDiv.className = 'map-row';

            for (const node of floorNodes) {
                const nodeDiv = document.createElement('div');
                nodeDiv.className = `map-node map-node-${node.type}`;
                
                if (node.visited) nodeDiv.classList.add('node-visited');
                if (node.available && !node.visited) nodeDiv.classList.add('node-available');
                if (!node.available && !node.visited) nodeDiv.classList.add('node-locked');

                const icon = document.createElement('div');
                icon.className = 'node-icon';
                icon.textContent = node.getIcon();

                const label = document.createElement('div');
                label.className = 'node-label';
                label.textContent = node.getLabel();

                nodeDiv.appendChild(icon);
                nodeDiv.appendChild(label);

                if (node.available && !node.visited) {
                    nodeDiv.addEventListener('click', () => this.onNodeClick(node));
                }

                rowDiv.appendChild(nodeDiv);
            }

            mapGrid.appendChild(rowDiv);
        }

        // Update stats display
        this.updateMapStats();
    }

    updateMapStats() {
        const mapHp = document.getElementById('mapHp');
        const mapEnergy = document.getElementById('mapEnergy');
        const mapGold = document.getElementById('mapGold');
        const mapFloor = document.getElementById('mapFloor');

        if (mapHp) mapHp.textContent = `${gameState.player.hp}/${gameState.player.maxHp}`;
        if (mapEnergy) mapEnergy.textContent = gameState.player.energy;
        if (mapGold) mapGold.textContent = gameState.player.gold;
        if (mapFloor) mapFloor.textContent = `Floor ${gameState.currentFloor}`;
    }

    onNodeClick(node) {
        if (window.game) {
            window.game.enterNode(node);
        }
    }

    // ========== COMBAT UI ==========
    bindCombatEvents() {
        const rollDiceBtn = document.getElementById('rollDiceBtn');
        const rerollBtn = document.getElementById('rerollBtn');
        const endTurnBtn = document.getElementById('endTurnBtn');
        const useSkillBtn = document.getElementById('useSkillBtn');

        if (rollDiceBtn) {
            rollDiceBtn.addEventListener('click', () => this.onRollDice());
        }
        if (rerollBtn) {
            rerollBtn.addEventListener('click', () => this.onReroll());
        }
        if (endTurnBtn) {
            endTurnBtn.addEventListener('click', () => this.onEndTurn());
        }
        if (useSkillBtn) {
            useSkillBtn.addEventListener('click', () => this.showSkillsMenu());
        }

        // Bind slot clicks
        ['attack', 'block', 'heal', 'charge'].forEach(slotName => {
            const slot = document.getElementById(`${slotName}Slot`);
            if (slot) {
                slot.addEventListener('click', () => this.onSlotClick(slotName));
            }
        });
    }

    renderCombat() {
        this.updatePlayerStats();
        this.updateEnemyDisplay();
        this.renderDice();
        this.updateSlots();
        this.updateCombatButtons();
    }

    updatePlayerStats() {
        const playerHp = document.getElementById('playerHp');
        const playerHpBar = document.getElementById('playerHpBar');
        const playerShield = document.getElementById('playerShield');
        const playerShieldBar = document.getElementById('playerShieldBar');
        const playerEnergy = document.getElementById('playerEnergy');
        const rerollsLeft = document.getElementById('rerollsLeft');

        const hpPercent = (gameState.player.hp / gameState.player.maxHp) * 100;
        const shieldPercent = Math.min(100, (gameState.player.shield / gameState.player.maxHp) * 100);

        if (playerHp) playerHp.textContent = `${gameState.player.hp}/${gameState.player.maxHp}`;
        if (playerHpBar) playerHpBar.style.width = `${hpPercent}%`;
        if (playerShield) playerShield.textContent = gameState.player.shield;
        if (playerShieldBar) playerShieldBar.style.width = `${shieldPercent}%`;
        if (playerEnergy) playerEnergy.textContent = gameState.player.energy;
        
        const rerollsRemaining = gameState.player.maxRerolls - combatManager.diceManager.rerollsUsed;
        if (rerollsLeft) rerollsLeft.textContent = rerollsRemaining;
    }

    updateEnemyDisplay() {
        const enemy = combatManager.currentEnemy;
        if (!enemy) return;

        const enemyName = document.getElementById('enemyName');
        const enemySprite = document.getElementById('enemySprite');
        const enemyHp = document.getElementById('enemyHp');
        const enemyHpBar = document.getElementById('enemyHpBar');
        const enemyIntent = document.getElementById('enemyIntent');

        if (enemyName) enemyName.textContent = enemy.name;
        if (enemySprite) enemySprite.textContent = enemy.sprite;
        if (enemyHp) enemyHp.textContent = `${enemy.currentHp}/${enemy.maxHp}`;
        
        const hpPercent = (enemy.currentHp / enemy.maxHp) * 100;
        if (enemyHpBar) enemyHpBar.style.width = `${hpPercent}%`;

        // Show intent
        const intent = combatManager.enemyIntent;
        if (enemyIntent && intent) {
            enemyIntent.innerHTML = `
                <span class="intent-icon">${intent.icon}</span>
                <span class="intent-text">${intent.text}</span>
            `;
        }
    }

    renderDice() {
        const diceArea = document.getElementById('diceArea');
        if (!diceArea) return;

        diceArea.innerHTML = '';
        const dice = combatManager.diceManager.dice;

        dice.forEach((value, index) => {
            const dieDiv = document.createElement('div');
            dieDiv.className = 'die';
            dieDiv.textContent = value;
            dieDiv.dataset.index = index;

            // Check if selected
            if (combatManager.diceManager.selectedDice.includes(index)) {
                dieDiv.classList.add('selected');
            }

            // Check if allocated
            if (combatManager.diceManager.isDieAllocated(index)) {
                dieDiv.classList.add('in-slot');
            } else {
                dieDiv.addEventListener('click', () => this.onDieClick(index));
            }

            diceArea.appendChild(dieDiv);
        });
    }

    onDieClick(index) {
        combatManager.diceManager.toggleSelectDie(index);
        this.renderDice();
        this.updateCombatButtons();
    }

    updateSlots() {
        ['attack', 'block', 'heal', 'charge'].forEach(slotName => {
            const slotDice = document.querySelector(`#${slotName}Slot .slot-dice`);
            const slotValue = document.querySelector(`#${slotName}Slot .slot-value`);
            const slot = document.getElementById(`${slotName}Slot`);

            if (!slotDice || !slotValue) return;

            // Render dice in slot
            slotDice.innerHTML = '';
            const diceInSlot = combatManager.diceManager.allocatedDice[slotName];
            
            diceInSlot.forEach(die => {
                const dieDiv = document.createElement('div');
                dieDiv.className = 'slot-die';
                dieDiv.textContent = die.value;
                dieDiv.dataset.index = die.index;
                dieDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    combatManager.diceManager.removeFromSlot(slotName, die.index);
                    this.renderDice();
                    this.updateSlots();
                    this.updateCombatButtons();
                });
                slotDice.appendChild(dieDiv);
            });

            // Calculate and show value
            const values = combatManager.diceManager.getSlotValues(slotName);
            let displayText = '';
            
            if (values.length > 0) {
                if (slot) slot.classList.add('slot-has-dice');
                switch(slotName) {
                    case 'attack':
                        const attack = DiceMatchingmatcher.calculateAttack(values);
                        displayText = `${attack.damage} DMG (${attack.combo})`;
                        break;
                    case 'block':
                        const block = DiceMatchingmatcher.calculateBlock(values);
                        displayText = `${block.shield} Shield (${block.combo})`;
                        break;
                    case 'heal':
                        const heal = DiceMatchingmatcher.calculateHeal(values);
                        displayText = `${heal.heal} HP (${heal.combo})`;
                        break;
                    case 'charge':
                        const charge = DiceMatchingmatcher.calculateCharge(values);
                        displayText = `+${charge.energy} Energy (${charge.combo})`;
                        break;
                }
            } else {
                if (slot) slot.classList.remove('slot-has-dice');
                displayText = '0';
            }

            slotValue.textContent = displayText;
        });
    }

    onSlotClick(slotName) {
        if (combatManager.diceManager.selectedDice.length > 0) {
            combatManager.diceManager.allocateToSlot(slotName);
            this.renderDice();
            this.updateSlots();
            this.updateCombatButtons();
        }
    }

    updateCombatButtons() {
        const rollDiceBtn = document.getElementById('rollDiceBtn');
        const rerollBtn = document.getElementById('rerollBtn');
        const endTurnBtn = document.getElementById('endTurnBtn');

        const hasRolled = combatManager.diceManager.dice.length > 0;
        const hasSelected = combatManager.diceManager.selectedDice.length > 0;
        const canReroll = combatManager.diceManager.rerollsUsed < gameState.player.maxRerolls;
        const allAllocated = combatManager.diceManager.allDiceAllocated();

        if (rollDiceBtn) {
            rollDiceBtn.style.display = hasRolled ? 'none' : 'block';
        }
        if (rerollBtn) {
            rerollBtn.style.display = hasRolled && !allAllocated ? 'block' : 'none';
            rerollBtn.disabled = !hasSelected || !canReroll;
        }
        if (endTurnBtn) {
            endTurnBtn.disabled = !allAllocated;
        }
    }

    onRollDice() {
        const diceCount = gameState ? gameState.player.diceCount : 5;
        combatManager.diceManager.rollDice(diceCount);
        this.renderDice();
        this.updateCombatButtons();
    }

    onReroll() {
        if (combatManager.diceManager.rerollSelected()) {
            this.renderDice();
            this.updateCombatButtons();
        }
    }

    onEndTurn() {
        if (window.game) {
            window.game.executeCombatTurn();
        }
    }

    showSkillsMenu() {
        const modal = document.getElementById('skillsModal');
        const skillsList = document.getElementById('skillsList');
        const energyDisplay = document.getElementById('skillsModalEnergy');
        const closeBtn = document.getElementById('closeSkillsBtn');

        if (!modal || !skillsList) return;

        // Update energy display
        if (energyDisplay) {
            energyDisplay.textContent = gameState.player.energy;
        }

        // Clear current skills list
        skillsList.innerHTML = '';

        // Check if player has any skills
        if (!gameState.skills || gameState.skills.length === 0) {
            skillsList.innerHTML = '<p class="no-skills-message">No skills learned yet.</p>';
        } else {
            // Create skill cards
            gameState.skills.forEach(skill => {
                const card = this.createSkillCard(skill);
                skillsList.appendChild(card);
            });
        }

        // Show modal
        modal.style.display = 'flex';

        // Setup close button
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }

        // Close on overlay click
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.onclick = () => {
                modal.style.display = 'none';
            };
        }
    }

    createSkillCard(skill) {
        const card = document.createElement('div');
        card.className = 'skill-card';

        // Determine if player can use this skill
        const canUse = gameState.player.energy >= skill.energyCost;
        card.classList.add(canUse ? 'can-use' : 'cannot-use');

        // Skill header (name and cost)
        const header = document.createElement('div');
        header.className = 'skill-card-header';

        const name = document.createElement('div');
        name.className = `skill-name rarity-${skill.rarity}`;
        name.textContent = skill.name;

        const cost = document.createElement('div');
        cost.className = 'skill-cost';
        if (skill.energyCost === 999) {
            cost.innerHTML = '<span class="stat-icon">⚡</span><span>ALL</span>';
        } else {
            cost.innerHTML = `<span class="stat-icon">⚡</span><span>${skill.energyCost}</span>`;
        }

        header.appendChild(name);
        header.appendChild(cost);

        // Skill description
        const desc = document.createElement('div');
        desc.className = 'skill-description';
        desc.textContent = skill.description;

        // Use button
        const useBtn = document.createElement('button');
        useBtn.className = 'skill-use-btn';
        useBtn.textContent = 'Use Skill';
        useBtn.disabled = !canUse;

        if (canUse) {
            useBtn.onclick = () => {
                this.useSkill(skill);
            };
        }

        card.appendChild(header);
        card.appendChild(desc);
        card.appendChild(useBtn);

        return card;
    }

    useSkill(skill) {
        // Close the modal first
        const modal = document.getElementById('skillsModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Call game's useSkill function
        if (window.game) {
            window.game.useSkill(skill);
        }
    }

    // ========== REWARD SCREEN ==========
    showRewardScreen(rewards) {
        const rewardChoices = document.getElementById('rewardChoices');
        const rewardGold = document.getElementById('rewardGold');
        const continueMapBtn = document.getElementById('continueMapBtn');

        if (rewardGold) {
            rewardGold.textContent = gameState.combatRewardsGold;
        }

        if (rewardChoices) {
            rewardChoices.innerHTML = '';
            rewards.forEach((reward, index) => {
                const card = this.createRewardCard(reward, index);
                rewardChoices.appendChild(card);
            });
        }

        if (continueMapBtn) {
            continueMapBtn.onclick = () => {
                this.showScreen('mapScreen');
                this.renderMap();
            };
        }

        this.showScreen('rewardScreen');
    }

    createRewardCard(reward, index) {
        const card = document.createElement('div');
        card.className = 'reward-card';
        
        card.innerHTML = `
            <div class="reward-card-type">${reward.type}</div>
            <div class="reward-card-name">${reward.name}</div>
            <div class="reward-card-desc">${reward.description}</div>
        `;

        card.addEventListener('click', () => {
            if (window.game) {
                window.game.selectReward(reward);
            }
        });

        return card;
    }

    // ========== EVENT SCREEN ==========
    showEventScreen(event) {
        const eventTitle = document.getElementById('eventTitle');
        const eventDescription = document.getElementById('eventDescription');
        const eventChoices = document.getElementById('eventChoices');

        if (eventTitle) eventTitle.textContent = event.title;
        if (eventDescription) eventDescription.textContent = event.description;
        
        if (eventChoices) {
            eventChoices.innerHTML = '';
            event.choices.forEach((choice, index) => {
                const canChoose = !choice.requirement || choice.requirement(gameState);
                const choiceDiv = document.createElement('div');
                choiceDiv.className = 'event-choice';
                if (!canChoose) {
                    choiceDiv.style.opacity = '0.5';
                    choiceDiv.style.cursor = 'not-allowed';
                }
                
                choiceDiv.innerHTML = `<div class="event-choice-text">${choice.text}</div>`;
                
                if (canChoose) {
                    choiceDiv.addEventListener('click', () => {
                        if (window.game) {
                            window.game.executeEventChoice(event, index);
                        }
                    });
                }
                
                eventChoices.appendChild(choiceDiv);
            });
        }

        this.showScreen('eventScreen');
    }

    // ========== SHOP SCREEN ==========
    showShopScreen(inventory) {
        const shopItems = document.getElementById('shopItems');
        const shopGold = document.getElementById('shopGold');
        const leaveShopBtn = document.getElementById('leaveShopBtn');

        if (shopGold) {
            shopGold.textContent = gameState.player.gold;
        }

        if (shopItems) {
            shopItems.innerHTML = '';
            inventory.forEach(item => {
                const itemDiv = this.createShopItem(item);
                shopItems.appendChild(itemDiv);
            });
        }

        if (leaveShopBtn) {
            leaveShopBtn.onclick = () => {
                this.showScreen('mapScreen');
                this.renderMap();
            };
        }

        this.showScreen('shopScreen');
    }

    createShopItem(item) {
        const canAfford = gameState.player.gold >= item.price;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        if (!canAfford) itemDiv.classList.add('shop-item-disabled');
        
        itemDiv.innerHTML = `
            <div class="shop-item-header">
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-price">💰 ${item.price}</div>
            </div>
            <div class="shop-item-desc">${item.description}</div>
        `;

        if (canAfford) {
            itemDiv.addEventListener('click', () => {
                const result = buyShopItem(item, gameState);
                if (result.success) {
                    // Refresh shop display
                    const newInventory = generateShopInventory();
                    this.showShopScreen(newInventory);
                }
            });
        }

        return itemDiv;
    }

    // ========== REST SCREEN ==========
    showRestScreen() {
        const restBtn = document.getElementById('restBtn');
        const skipRestBtn = document.getElementById('skipRestBtn');

        if (restBtn) {
            restBtn.onclick = () => {
                gameState.heal(25);
                this.showScreen('mapScreen');
                this.renderMap();
            };
        }

        if (skipRestBtn) {
            skipRestBtn.onclick = () => {
                this.showScreen('mapScreen');
                this.renderMap();
            };
        }

        this.showScreen('restScreen');
    }

    // ========== STATS SCREEN ==========
    showStatsScreen() {
        const stats = gameState.loadStats();
        
        const statTotalRuns = document.getElementById('statTotalRuns');
        const statVictories = document.getElementById('statVictories');
        const statBestFloor = document.getElementById('statBestFloor');
        const statWinRate = document.getElementById('statWinRate');
        const runHistory = document.getElementById('runHistory');

        if (statTotalRuns) statTotalRuns.textContent = stats.totalRuns;
        if (statVictories) statVictories.textContent = stats.victories;
        if (statBestFloor) statBestFloor.textContent = stats.bestFloor;
        
        const winRate = stats.totalRuns > 0 ? Math.round((stats.victories / stats.totalRuns) * 100) : 0;
        if (statWinRate) statWinRate.textContent = `${winRate}%`;

        if (runHistory) {
            runHistory.innerHTML = '';
            if (stats.runHistory.length === 0) {
                runHistory.innerHTML = '<div class="run-entry">No runs yet</div>';
            } else {
                stats.runHistory.forEach(run => {
                    const entryDiv = document.createElement('div');
                    entryDiv.className = `run-entry ${run.victory ? 'run-victory' : 'run-defeat'}`;
                    entryDiv.innerHTML = `
                        <div>${run.date} - Floor ${run.floor} - ${run.victory ? 'Victory!' : 'Defeat'}</div>
                        <div>Seed: ${SeededRNG.seedToString(run.seed)} | Gold: ${run.gold} | Kills: ${run.kills}</div>
                    `;
                    runHistory.appendChild(entryDiv);
                });
            }
        }

        this.showScreen('statsScreen');
    }

    // ========== GAME OVER SCREEN ==========
    showGameOverScreen(victory) {
        const gameOverTitle = document.getElementById('gameOverTitle');
        const victoryContent = document.getElementById('victoryContent');
        const defeatContent = document.getElementById('defeatContent');
        const retryBtn = document.getElementById('retryBtn');
        const mainMenuBtn = document.getElementById('mainMenuBtn');

        if (gameOverTitle) {
            gameOverTitle.textContent = victory ? 'Victory!' : 'Game Over';
            gameOverTitle.className = `gameover-title ${victory ? 'victory' : 'defeat'}`;
        }

        // Show/hide appropriate content
        if (victoryContent) victoryContent.style.display = victory ? 'block' : 'none';
        if (defeatContent) defeatContent.style.display = victory ? 'none' : 'block';

        if (victory) {
            // Populate victory screen
            this.populateVictoryScreen();
        } else {
            // Populate defeat screen
            const finalFloor = document.getElementById('finalFloor');
            const finalGold = document.getElementById('finalGold');
            const finalKills = document.getElementById('finalKills');
            
            if (finalFloor) finalFloor.textContent = gameState.currentFloor;
            if (finalGold) finalGold.textContent = gameState.player.gold;
            if (finalKills) finalKills.textContent = gameState.stats.enemiesDefeated;
        }

        if (retryBtn) {
            retryBtn.onclick = () => {
                const seed = gameState.seed;
                if (window.game) {
                    window.game.startNewGame(seed);
                }
            };
        }

        if (mainMenuBtn) {
            mainMenuBtn.onclick = () => {
                this.showScreen('mainMenu');
                this.updateMainMenu();
            };
        }

        this.showScreen('gameOverScreen');
    }

    populateVictoryScreen() {
        // Stats
        const victoryTurns = document.getElementById('victoryTurns');
        const victoryKills = document.getElementById('victoryKills');
        const victoryDamage = document.getElementById('victoryDamage');
        const victoryGold = document.getElementById('victoryGold');

        if (victoryTurns) victoryTurns.textContent = gameState.stats.turnsPlayed || 0;
        if (victoryKills) victoryKills.textContent = gameState.stats.enemiesDefeated || 0;
        if (victoryDamage) victoryDamage.textContent = gameState.stats.damageDealt || 0;
        if (victoryGold) victoryGold.textContent = gameState.stats.goldEarned || 0;

        // Progression
        const victoryFights = document.getElementById('victoryFights');
        const victoryShops = document.getElementById('victoryShops');
        const victoryEvents = document.getElementById('victoryEvents');

        if (victoryFights) victoryFights.textContent = gameState.stats.fightsCompleted || 0;
        if (victoryShops) victoryShops.textContent = gameState.stats.shopsVisited || 0;
        if (victoryEvents) victoryEvents.textContent = gameState.stats.eventsCompleted || 0;

        // Perks
        const victoryPerksList = document.getElementById('victoryPerksList');
        if (victoryPerksList) {
            victoryPerksList.innerHTML = '';
            if (gameState.perks.length === 0) {
                victoryPerksList.innerHTML = '<p style="font-size: 10px; color: var(--pixel-text-dim); text-align: center;">ไม่มี Perks</p>';
            } else {
                gameState.perks.forEach(perk => {
                    const badge = document.createElement('div');
                    badge.className = 'item-badge';
                    badge.innerHTML = `
                        <span class="item-badge-name">${perk.name}</span>
                        <span class="item-badge-desc">${perk.description}</span>
                    `;
                    victoryPerksList.appendChild(badge);
                });
            }
        }

        // Skills (show all skills that were acquired, even if used)
        const victorySkillsList = document.getElementById('victorySkillsList');
        if (victorySkillsList) {
            victorySkillsList.innerHTML = '';
            // We need to track acquired skills in stats
            if (!gameState.stats.skillsAcquired || gameState.stats.skillsAcquired.length === 0) {
                victorySkillsList.innerHTML = '<p style="font-size: 10px; color: var(--pixel-text-dim); text-align: center;">ไม่มี Skills</p>';
            } else {
                gameState.stats.skillsAcquired.forEach(skill => {
                    const badge = document.createElement('div');
                    badge.className = 'item-badge';
                    badge.innerHTML = `
                        <span class="item-badge-name">${skill.name}</span>
                        <span class="item-badge-desc">${skill.description}</span>
                    `;
                    victorySkillsList.appendChild(badge);
                });
            }
        }
    }

    showMainMenu() {
        this.showScreen('mainMenu');
        this.updateMainMenu();
    }
}

// Global UI manager
let uiManager = null;

function initUI() {
    uiManager = new UIManager();
    return uiManager;
}

function getUI() {
    if (!uiManager) {
        uiManager = new UIManager();
    }
    return uiManager;
}


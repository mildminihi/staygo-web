// Dice Challenge Game - Core Game Logic

class GameState {
    constructor() {
        this.mode = 'normal'; // 'normal' or 'team'
        this.diceCount = 1;
        this.cards = [];
        this.selectedCard = null;
        
        // Normal mode
        this.diceResults = [];
        this.diceSum = 0;
        
        // Team mode
        this.teamCount = 2;
        this.currentTeamIndex = 0;
        this.teamScores = []; // Array of scores for each team
        this.usedCards = []; // Shared pool of used cards for all teams
        this.playerCount = 0;
    }

    // Initialize game
    startGame(mode, diceCount, teamCount = 2) {
        this.mode = mode;
        this.diceCount = diceCount;
        this.cards = getCardsForDiceCount(diceCount);
        this.selectedCard = null;
        this.diceResults = [];
        this.diceSum = 0;
        
        if (mode === 'team') {
            this.teamCount = teamCount;
            this.currentTeamIndex = 0;
            this.teamScores = new Array(teamCount).fill(0);
            this.usedCards = []; // Shared pool for all teams
            this.playerCount = 0;
        } else {
            this.playerCount = 0;
            this.totalScore = 0;
            this.usedCards = [];
        }
    }

    // Select a card
    selectCard(cardId) {
        // Check if card is already used (shared pool in team mode)
        if (this.mode === 'team') {
            if (this.usedCards.includes(cardId)) {
                return false;
            }
        }
        
        const card = this.cards.find(c => c.id === cardId);
        if (card) {
            this.selectedCard = card;
            return true;
        }
        return false;
    }
    
    // Check if card is used (shared pool in team mode)
    isCardUsed(cardId) {
        if (this.mode === 'team') {
            return this.usedCards.includes(cardId);
        }
        return false;
    }
    
    // Get current team number (1-based)
    getCurrentTeamNumber() {
        return this.currentTeamIndex + 1;
    }
    
    // Get current team score
    getCurrentTeamScore() {
        return this.teamScores[this.currentTeamIndex] || 0;
    }
    
    // Get all team scores
    getAllTeamScores() {
        return this.teamScores.map((score, index) => ({
            teamNumber: index + 1,
            score: score
        }));
    }

    // Roll dice (normal mode)
    rollDice() {
        this.diceResults = [];
        for (let i = 0; i < this.diceCount; i++) {
            this.diceResults.push(Math.floor(Math.random() * 6) + 1);
        }
        this.diceSum = this.diceResults.reduce((a, b) => a + b, 0);
        return {
            dice: [...this.diceResults],
            sum: this.diceSum
        };
    }

    // Check if selected card matches dice results
    checkCardMatch() {
        if (!this.selectedCard || this.diceResults.length === 0) {
            return false;
        }
        return checkCardCondition(this.selectedCard, this.diceResults);
    }

    // Team mode: Set player count
    setPlayerCount(count) {
        const numCount = parseInt(count) || 0;
        this.playerCount = Math.max(0, numCount);
    }

    // Team mode: Calculate score for current card
    calculateScore() {
        if (!this.selectedCard) {
            return 0;
        }
        return this.selectedCard.points * this.playerCount;
    }

    // Team mode: Add score and mark card as used, then move to next team
    addScore() {
        if (!this.selectedCard) {
            return false;
        }
        
        // Allow 0 score (when no players matched the condition)
        const points = this.calculateScore();
        this.teamScores[this.currentTeamIndex] += points;
        
        // Mark card as used in shared pool (all teams share the same pool)
        if (!this.usedCards.includes(this.selectedCard.id)) {
            this.usedCards.push(this.selectedCard.id);
        }
        
        // Move to next team
        this.currentTeamIndex = (this.currentTeamIndex + 1) % this.teamCount;
        
        // Reset for next team
        this.selectedCard = null;
        this.playerCount = 0;
        
        return true;
    }

    // Get current cards
    getCards() {
        return this.cards;
    }

    // Get selected card
    getSelectedCard() {
        return this.selectedCard;
    }
}

// Global game instance
let gameState = new GameState();

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

// Initialize game
function initializeGame() {
    setupEventListeners();
    showScreen('setup');
}

// Setup event listeners
function setupEventListeners() {
    // Mode buttons
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show/hide team count input
            const teamCountSection = document.getElementById('teamCountSection');
            if (teamCountSection) {
                if (btn.dataset.mode === 'team') {
                    teamCountSection.style.display = 'block';
                } else {
                    teamCountSection.style.display = 'none';
                }
            }
        });
    });

    // Dice count buttons
    const diceCountBtns = document.querySelectorAll('.dice-count-btn');
    diceCountBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            diceCountBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Start game button
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', handleStartGame);
    }

    // Back to setup buttons
    const backBtns = document.querySelectorAll('.back-btn');
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            gameState = new GameState();
            showScreen('setup');
            
            // Hide team count section
            const teamCountSection = document.getElementById('teamCountSection');
            if (teamCountSection) {
                teamCountSection.style.display = 'none';
            }
        });
    });

    // Roll dice button (normal mode)
    const rollBtn = document.getElementById('rollDiceBtn');
    if (rollBtn) {
        rollBtn.addEventListener('click', handleRollDice);
    }

    // Team mode: Player count input
    const playerCountInput = document.getElementById('playerCountInput');
    if (playerCountInput) {
        playerCountInput.addEventListener('input', handlePlayerCountChange);
    }

    // Team mode: Add score button
    const addScoreBtn = document.getElementById('addScoreBtn');
    if (addScoreBtn) {
        addScoreBtn.addEventListener('click', handleAddScore);
    }
}

// Handle start game
function handleStartGame() {
    const activeModeBtn = document.querySelector('.mode-btn.active');
    const activeDiceBtn = document.querySelector('.dice-count-btn.active');
    
    if (!activeModeBtn || !activeDiceBtn) return;

    const mode = activeModeBtn.dataset.mode;
    const diceCount = parseInt(activeDiceBtn.dataset.count);
    
    let teamCount = 2;
    if (mode === 'team') {
        const teamCountInput = document.getElementById('teamCountInput');
        if (teamCountInput) {
            teamCount = parseInt(teamCountInput.value) || 2;
            teamCount = Math.max(2, Math.min(10, teamCount)); // Limit 2-10 teams
        }
    }

    gameState.startGame(mode, diceCount, teamCount);
    
    if (mode === 'normal') {
        showScreen('gameNormal');
        if (typeof renderNormalMode === 'function') {
            renderNormalMode();
        }
    } else {
        showScreen('gameTeam');
        if (typeof renderTeamMode === 'function') {
            renderTeamMode();
        }
    }
}

// Handle roll dice (normal mode)
function handleRollDice() {
    if (!gameState.selectedCard) return;
    
    const result = gameState.rollDice();
    renderDiceResults(result);
    
    // Check if card matches
    const matches = gameState.checkCardMatch();
    if (matches) {
        showCardMatch(true);
    } else {
        showCardMatch(false);
    }
}

// Handle player count change (host mode)
function handlePlayerCountChange() {
    const input = document.getElementById('playerCountInput');
    if (!input) return;
    
    const count = parseInt(input.value) || 0;
    gameState.setPlayerCount(count);
    if (typeof updatePlayerCountDisplay === 'function') {
        updatePlayerCountDisplay();
    }
    if (typeof updateAddScoreButtonState === 'function') {
        updateAddScoreButtonState();
    }
}

// Handle add score (team mode)
function handleAddScore() {
    if (!gameState.selectedCard) return;
    
    const success = gameState.addScore();
    if (success) {
        // Update displays
        if (typeof updateCurrentTeamDisplay === 'function') {
            updateCurrentTeamDisplay();
        }
        if (typeof updateTeamsScoreboard === 'function') {
            updateTeamsScoreboard();
        }
        if (typeof renderCardGrid === 'function') {
            renderCardGrid('cardGridTeam'); // Re-render to disable used card
        }
        
        // Reset form for next team
        const playerCountInput = document.getElementById('playerCountInput');
        if (playerCountInput) {
            playerCountInput.value = '0';
        }
        
        if (typeof updateSelectedCardDisplayTeam === 'function') {
            updateSelectedCardDisplayTeam();
        }
        if (typeof updatePlayerCountDisplay === 'function') {
            updatePlayerCountDisplay();
        }
        if (typeof updateAddScoreButtonState === 'function') {
            updateAddScoreButtonState();
        }
    }
}



// Show specific screen
function showScreen(screenName) {
    const screens = {
        'setup': document.getElementById('setupScreen'),
        'gameNormal': document.getElementById('gameScreenNormal'),
        'gameTeam': document.getElementById('gameScreenTeam')
    };

    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

// Update calculate button state
function updateCalculateButtonState() {
    const calculateBtn = document.getElementById('calculateScoreBtn');
    if (!calculateBtn) return;
    
    const hasSelectedCard = gameState.selectedCard !== null;
    const hasPlayers = gameState.players.length > 0;
    const allPlayersHaveDice = gameState.players.every(p => 
        p.dice.every(d => d !== null && d >= 1 && d <= 6)
    );
    
    calculateBtn.disabled = !(hasSelectedCard && hasPlayers && allPlayersHaveDice);
}

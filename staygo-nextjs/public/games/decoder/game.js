// Decoder Game - Core Game Logic

class GameState {
    constructor() {
        this.difficulty = 'medium';
        this.digitCount = 4;
        this.maxAttempts = 8;
        this.secretNumber = [];
        this.guesses = []; // Array of {digits: [], feedback: []}
        this.currentAttempt = 0;
        this.gameStatus = 'setup'; // setup | playing | victory | gameover
        this.startTime = null;
        this.endTime = null;
        this.timerInterval = null;
        this.score = 0;
    }

    // Start a new game with selected difficulty
    startGame(difficulty, digitCount) {
        this.difficulty = difficulty;
        this.digitCount = digitCount;
        this.secretNumber = this.generateSecret(digitCount);
        this.guesses = [];
        this.currentAttempt = 0;
        this.gameStatus = 'playing';
        this.startTime = Date.now();
        this.endTime = null;
        this.score = 0;
        this.startTimer();
        
        console.log('Secret:', this.secretNumber.join('')); // Debug only - remove in production
    }

    // Generate random secret number
    generateSecret(digitCount) {
        const digits = [];
        for (let i = 0; i < digitCount; i++) {
            digits.push(Math.floor(Math.random() * 10));
        }
        return digits;
    }

    // Check a guess against the secret number
    checkGuess(guess) {
        if (!guess || guess.length !== this.digitCount) {
            return null;
        }

        const result = new Array(this.digitCount).fill(null);
        const secretCopy = [...this.secretNumber];
        const guessCopy = [...guess];

        // First pass: Check for exact matches (green)
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === this.secretNumber[i]) {
                result[i] = 'green';
                secretCopy[i] = null;
                guessCopy[i] = null;
            }
        }

        // Second pass: Check for wrong position (yellow) or not in number (red)
        for (let i = 0; i < guess.length; i++) {
            if (guessCopy[i] !== null) {
                const index = secretCopy.indexOf(guessCopy[i]);
                if (index !== -1) {
                    result[i] = 'yellow';
                    secretCopy[index] = null;
                } else {
                    result[i] = 'red';
                }
            }
        }

        return result;
    }

    // Submit a guess
    submitGuess(guess) {
        if (this.gameStatus !== 'playing') return false;
        if (this.currentAttempt >= this.maxAttempts) return false;

        const feedback = this.checkGuess(guess);
        if (!feedback) return false;

        this.guesses.push({
            digits: [...guess],
            feedback: feedback
        });

        this.currentAttempt++;

        // Check if guess is correct (all green)
        if (feedback.every(f => f === 'green')) {
            this.endGame(true);
            return true;
        }

        // Check if out of attempts
        if (this.currentAttempt >= this.maxAttempts) {
            this.endGame(false);
            return true;
        }

        return true;
    }

    // End the game
    endGame(victory) {
        this.gameStatus = victory ? 'victory' : 'gameover';
        this.endTime = Date.now();
        this.stopTimer();
        
        if (victory) {
            this.calculateScore();
        } else {
            this.score = 0;
        }
    }

    // Calculate score
    calculateScore() {
        const timeSeconds = this.getElapsedSeconds();
        const attempts = this.currentAttempt;
        const baseScore = 1000;
        const attemptPenalty = attempts * 100;
        const timePenalty = timeSeconds;
        
        const difficultyMultipliers = {
            'easy': 1.0,
            'medium': 1.5,
            'hard': 2.0
        };
        
        const multiplier = difficultyMultipliers[this.difficulty] || 1.0;
        const rawScore = (baseScore - attemptPenalty - timePenalty) * multiplier;
        this.score = Math.max(0, Math.round(rawScore));
        
        return this.score;
    }

    // Timer management
    startTimer() {
        this.timerInterval = setInterval(() => {
            if (typeof updateTimerDisplay === 'function') {
                updateTimerDisplay();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // Get elapsed time in seconds
    getElapsedSeconds() {
        if (!this.startTime) return 0;
        const endTime = this.endTime || Date.now();
        return Math.floor((endTime - this.startTime) / 1000);
    }

    // Get formatted time MM:SS
    getFormattedTime() {
        const totalSeconds = this.getElapsedSeconds();
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Get attempts remaining
    getAttemptsRemaining() {
        return this.maxAttempts - this.currentAttempt;
    }

    // Reset game to setup
    resetToSetup() {
        this.stopTimer();
        this.difficulty = 'medium';
        this.digitCount = 4;
        this.secretNumber = [];
        this.guesses = [];
        this.currentAttempt = 0;
        this.gameStatus = 'setup';
        this.startTime = null;
        this.endTime = null;
        this.score = 0;
    }

    // Play again with same difficulty
    playAgain() {
        this.stopTimer();
        const currentDifficulty = this.difficulty;
        const currentDigitCount = this.digitCount;
        this.startGame(currentDifficulty, currentDigitCount);
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
    // Difficulty buttons
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    difficultyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Start game button
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', handleStartGame);
    }

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClear);
    }

    // Submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmit);
    }

    // Play again button
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', handlePlayAgain);
    }

    // Change difficulty button
    const changeDifficultyBtn = document.getElementById('changeDifficultyBtn');
    if (changeDifficultyBtn) {
        changeDifficultyBtn.addEventListener('click', handleChangeDifficulty);
    }
}

// Handle start game
function handleStartGame() {
    const activeBtn = document.querySelector('.difficulty-btn.active');
    if (!activeBtn) return;

    const difficulty = activeBtn.dataset.difficulty;
    const digitCount = parseInt(activeBtn.dataset.digits);

    gameState.startGame(difficulty, digitCount);
    showScreen('playing');
    renderPlayingScreen();
}

// Handle clear input
function handleClear() {
    clearCurrentInput();
}

// Handle submit guess
function handleSubmit() {
    const guess = getCurrentGuess();
    if (!guess || guess.length !== gameState.digitCount) {
        shakeInputs();
        return;
    }

    // Check if all digits are filled
    if (guess.some(d => d === null || d === undefined)) {
        shakeInputs();
        return;
    }

    // Submit the guess
    const success = gameState.submitGuess(guess);
    if (success) {
        renderGuessHistory();
        updateGameHeader();
        clearCurrentInput();
        
        // Check if game ended
        if (gameState.gameStatus === 'victory' || gameState.gameStatus === 'gameover') {
            setTimeout(() => {
                showScreen('end');
                renderEndScreen();
            }, 1500); // Delay to show final guess animation
        } else {
            // Focus first input for next guess
            focusFirstInput();
        }
    }
}

// Handle play again
function handlePlayAgain() {
    gameState.playAgain();
    showScreen('playing');
    renderPlayingScreen();
}

// Handle change difficulty
function handleChangeDifficulty() {
    gameState.resetToSetup();
    showScreen('setup');
}

// Show specific screen
function showScreen(screenName) {
    const screens = {
        'setup': document.getElementById('setupScreen'),
        'playing': document.getElementById('playingScreen'),
        'end': document.getElementById('endScreen')
    };

    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });

    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }
}

// Update timer display
function updateTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (timerEl && gameState) {
        timerEl.textContent = gameState.getFormattedTime();
    }
}

// Render playing screen
function renderPlayingScreen() {
    renderDigitInputs();
    renderGuessHistory();
    updateGameHeader();
    focusFirstInput();
}

// Render digit input boxes
function renderDigitInputs() {
    const container = document.getElementById('digitInputs');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < gameState.digitCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.pattern = '[0-9]';
        input.maxLength = 1;
        input.className = 'digit-input';
        input.dataset.index = i;
        
        // Auto-advance on input
        input.addEventListener('input', (e) => handleDigitInput(e, i));
        
        // Handle backspace
        input.addEventListener('keydown', (e) => handleDigitKeydown(e, i));
        
        container.appendChild(input);
    }
}

// Update game header
function updateGameHeader() {
    const attemptsEl = document.getElementById('attempts');
    const difficultyBadgeEl = document.getElementById('difficultyBadge');

    if (attemptsEl) {
        attemptsEl.textContent = `${gameState.currentAttempt} / ${gameState.maxAttempts}`;
    }

    if (difficultyBadgeEl) {
        const difficultyNames = {
            'easy': 'ง่าย',
            'medium': 'ปานกลาง',
            'hard': 'ยาก'
        };
        difficultyBadgeEl.textContent = difficultyNames[gameState.difficulty] || 'Medium';
    }

    updateTimerDisplay();
}

// Render end screen
function renderEndScreen() {
    const endTitle = document.getElementById('endTitle');
    const secretNumberEl = document.getElementById('secretNumber');
    const finalScore = document.getElementById('finalScore');
    const finalTime = document.getElementById('finalTime');
    const finalAttempts = document.getElementById('finalAttempts');

    if (endTitle) {
        endTitle.textContent = gameState.gameStatus === 'victory' ? 'ชนะแล้ว!' : 'หมดโอกาส!';
        endTitle.className = `end-title ${gameState.gameStatus}`;
    }

    if (secretNumberEl) {
        secretNumberEl.innerHTML = '';
        gameState.secretNumber.forEach(digit => {
            const digitBox = document.createElement('div');
            digitBox.className = 'secret-digit';
            digitBox.textContent = digit;
            secretNumberEl.appendChild(digitBox);
        });
    }

    if (finalScore) finalScore.textContent = gameState.score;
    if (finalTime) finalTime.textContent = gameState.getFormattedTime();
    if (finalAttempts) finalAttempts.textContent = gameState.currentAttempt;
}

// Get current guess from inputs
function getCurrentGuess() {
    const inputs = document.querySelectorAll('.digit-input');
    const guess = [];
    
    inputs.forEach(input => {
        const value = input.value.trim();
        if (value === '') {
            guess.push(null);
        } else {
            guess.push(parseInt(value));
        }
    });
    
    return guess;
}

// Clear current input
function clearCurrentInput() {
    const inputs = document.querySelectorAll('.digit-input');
    inputs.forEach(input => {
        input.value = '';
    });
    focusFirstInput();
}

// Focus first input
function focusFirstInput() {
    const firstInput = document.querySelector('.digit-input');
    if (firstInput) {
        setTimeout(() => firstInput.focus(), 100);
    }
}

// Shake inputs for invalid input
function shakeInputs() {
    const container = document.getElementById('digitInputs');
    if (container) {
        container.classList.add('shake');
        setTimeout(() => {
            container.classList.remove('shake');
        }, 600);
    }
}

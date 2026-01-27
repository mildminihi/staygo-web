// Decoder Game - UI Logic and Input Handling

// Handle digit input with auto-advance
function handleDigitInput(event, index) {
    const input = event.target;
    let value = input.value;

    // Only allow digits 0-9
    value = value.replace(/[^0-9]/g, '');
    
    if (value.length > 1) {
        value = value.charAt(value.length - 1);
    }
    
    input.value = value;

    // Auto-advance to next input
    if (value && index < gameState.digitCount - 1) {
        const nextInput = document.querySelector(`.digit-input[data-index="${index + 1}"]`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    }
}

// Handle keydown for backspace navigation
function handleDigitKeydown(event, index) {
    const input = event.target;

    // Handle backspace
    if (event.key === 'Backspace' && !input.value && index > 0) {
        const prevInput = document.querySelector(`.digit-input[data-index="${index - 1}"]`);
        if (prevInput) {
            prevInput.focus();
            prevInput.select();
        }
    }

    // Handle Enter to submit
    if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmit();
    }

    // Handle arrow keys
    if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        const prevInput = document.querySelector(`.digit-input[data-index="${index - 1}"]`);
        if (prevInput) prevInput.focus();
    }
    
    if (event.key === 'ArrowRight' && index < gameState.digitCount - 1) {
        event.preventDefault();
        const nextInput = document.querySelector(`.digit-input[data-index="${index + 1}"]`);
        if (nextInput) nextInput.focus();
    }
}

// Render guess history
function renderGuessHistory() {
    const historyEl = document.getElementById('guessHistory');
    if (!historyEl) return;

    if (gameState.guesses.length === 0) {
        historyEl.innerHTML = '<p class="empty-message">ยังไม่มีการทาย</p>';
        return;
    }

    historyEl.innerHTML = '';
    
    // Render guesses in reverse order (latest first)
    for (let i = gameState.guesses.length - 1; i >= 0; i--) {
        const guess = gameState.guesses[i];
        const entry = createGuessEntry(i + 1, guess);
        historyEl.appendChild(entry);
    }
}

// Create guess entry element
function createGuessEntry(attemptNumber, guess) {
    const entry = document.createElement('div');
    entry.className = 'guess-entry';

    const attemptLabel = document.createElement('span');
    attemptLabel.className = 'attempt-number';
    attemptLabel.textContent = attemptNumber;

    const digitsContainer = document.createElement('div');
    digitsContainer.className = 'guess-digits';

    guess.digits.forEach((digit, index) => {
        const digitBox = document.createElement('div');
        digitBox.className = `digit-box ${guess.feedback[index]}`;
        digitBox.textContent = digit;
        
        // Add flip animation with stagger
        digitBox.style.animationDelay = `${index * 0.1}s`;
        
        digitsContainer.appendChild(digitBox);
    });

    entry.appendChild(attemptLabel);
    entry.appendChild(digitsContainer);

    return entry;
}

// Add confetti effect for victory
function showConfetti() {
    // Simple confetti using emoji
    const confettiEmojis = ['🎉', '🎊', '✨', '🌟', '💫', '⭐'];
    const container = document.body;

    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.textContent = confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.fontSize = (Math.random() * 20 + 20) + 'px';
        
        container.appendChild(confetti);

        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (event) => {
    // Number keys (0-9) - focus first empty input
    if (/^[0-9]$/.test(event.key) && gameState.gameStatus === 'playing') {
        const inputs = document.querySelectorAll('.digit-input');
        const focusedInput = document.activeElement;
        
        // If not focused on an input, focus first empty one
        if (!focusedInput || !focusedInput.classList.contains('digit-input')) {
            for (const input of inputs) {
                if (!input.value) {
                    input.focus();
                    break;
                }
            }
        }
    }
});

// Console greeting
console.log('%c🔢 Decoder Game', 'font-size: 20px; color: #10b981; font-weight: bold;');
console.log('%cทายตัวเลขลับภายใน 8 ครั้ง!', 'font-size: 14px; color: #6366f1;');
console.log('%cกด Enter เพื่อส่งคำตอบ', 'font-size: 12px; color: #888;');

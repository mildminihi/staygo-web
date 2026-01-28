// Dice Challenge Game - UI Logic and Rendering

// Render normal mode
function renderNormalMode() {
    renderCardGrid('cardGrid');
    updateSelectedCardDisplay();
    updateRollButtonState();
    
    // Hide dice display initially
    const diceDisplay = document.getElementById('diceDisplay');
    if (diceDisplay) {
        diceDisplay.style.display = 'none';
    }
}

// Render team mode
function renderTeamMode() {
    renderCardGrid('cardGridTeam');
    updateCurrentTeamDisplay();
    updateTeamsScoreboard();
    updateSelectedCardDisplayTeam();
    updatePlayerCountDisplay();
    updateAddScoreButtonState();
    
    // Reset player count input
    const playerCountInput = document.getElementById('playerCountInput');
    if (playerCountInput) {
        playerCountInput.value = '0';
    }
}

// Render card grid
function renderCardGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    const cards = gameState.getCards();
    
    // Check if this is team mode based on containerId or gameState.mode
    const isTeamMode = containerId.includes('Team') || gameState.mode === 'team';

    cards.forEach(card => {
        const cardElement = createCardElement(card, isTeamMode);
        container.appendChild(cardElement);
    });
}

// Create card element
function createCardElement(card, isTeamMode) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.cardId = card.id;
    
    // Check if card is used (team mode)
    const isUsed = isTeamMode && gameState.isCardUsed(card.id);
    if (isUsed) {
        cardDiv.classList.add('used');
        cardDiv.style.opacity = '0.5';
        cardDiv.style.cursor = 'not-allowed';
    }
    
    if (gameState.selectedCard && gameState.selectedCard.id === card.id && !isUsed) {
        cardDiv.classList.add('selected');
    }
    
    const cardName = document.createElement('div');
    cardName.className = 'card-name';
    cardName.textContent = card.name;
    
    const cardDesc = document.createElement('div');
    cardDesc.className = 'card-description';
    cardDesc.textContent = card.description;
    
    const cardPoints = document.createElement('div');
    cardPoints.className = 'card-points';
    cardPoints.textContent = `${card.points} แต้ม`;
    
    if (isUsed) {
        const usedBadge = document.createElement('div');
        usedBadge.className = 'used-badge';
        usedBadge.textContent = 'ใช้แล้ว';
        cardDiv.appendChild(usedBadge);
    }
    
    cardDiv.appendChild(cardName);
    cardDiv.appendChild(cardDesc);
    cardDiv.appendChild(cardPoints);
    
    // Add click handler (only if not used)
    if (!isUsed) {
        cardDiv.addEventListener('click', () => {
            if (isTeamMode) {
                handleCardSelectTeam(card.id);
            } else {
                handleCardSelectNormal(card.id);
            }
        });
    }
    
    return cardDiv;
}

// Handle card select (normal mode)
function handleCardSelectNormal(cardId) {
    gameState.selectCard(cardId);
    renderCardGrid('cardGrid');
    updateSelectedCardDisplay();
    updateRollButtonState();
    
    // Hide dice display when selecting new card
    const diceDisplay = document.getElementById('diceDisplay');
    if (diceDisplay) {
        diceDisplay.style.display = 'none';
    }
}

// Handle card select (team mode)
function handleCardSelectTeam(cardId) {
    // Don't allow selecting used cards
    if (gameState.isCardUsed(cardId)) {
        return;
    }
    
    const success = gameState.selectCard(cardId);
    if (success) {
        // Reset player count when selecting new card
        gameState.setPlayerCount(0);
        const playerCountInput = document.getElementById('playerCountInput');
        if (playerCountInput) {
            playerCountInput.value = '0';
        }
        
        renderCardGrid('cardGridTeam');
        updateSelectedCardDisplayTeam();
        updatePlayerCountDisplay();
        updateAddScoreButtonState();
    }
}

// Update selected card display (normal mode)
function updateSelectedCardDisplay() {
    const display = document.getElementById('selectedCardDisplay');
    const info = document.getElementById('selectedCardInfo');
    
    if (!display || !info) return;
    
    const selectedCard = gameState.getSelectedCard();
    if (selectedCard) {
        display.style.display = 'block';
        info.innerHTML = `
            <div class="selected-card-name">${selectedCard.name}</div>
            <div class="selected-card-desc">${selectedCard.description}</div>
            <div class="selected-card-points">${selectedCard.points} แต้ม</div>
        `;
    } else {
        display.style.display = 'none';
    }
}

// Update selected card display (team mode)
function updateSelectedCardDisplayTeam() {
    const display = document.getElementById('selectedCardDisplayTeam');
    const info = document.getElementById('selectedCardInfoTeam');
    
    if (!display || !info) return;
    
    const selectedCard = gameState.getSelectedCard();
    if (selectedCard && !gameState.isCardUsed(selectedCard.id)) {
        display.style.display = 'block';
        info.innerHTML = `
            <div class="selected-card-name">${selectedCard.name}</div>
            <div class="selected-card-desc">${selectedCard.description}</div>
            <div class="selected-card-points">${selectedCard.points} แต้ม</div>
        `;
    } else {
        display.style.display = 'none';
    }
}

// Update current team display
function updateCurrentTeamDisplay() {
    const teamNumber = document.getElementById('currentTeamNumber');
    const teamScore = document.getElementById('currentTeamScoreValue');
    
    if (teamNumber) {
        teamNumber.textContent = gameState.getCurrentTeamNumber();
    }
    
    if (teamScore) {
        teamScore.textContent = gameState.getCurrentTeamScore();
    }
}

// Update teams scoreboard
function updateTeamsScoreboard() {
    const scoreList = document.getElementById('teamsScoreList');
    if (!scoreList) return;
    
    scoreList.innerHTML = '';
    const allScores = gameState.getAllTeamScores();
    
    allScores.forEach(team => {
        const teamItem = document.createElement('div');
        teamItem.className = 'team-score-item';
        if (team.teamNumber === gameState.getCurrentTeamNumber()) {
            teamItem.classList.add('current-team');
        }
        
        teamItem.innerHTML = `
            <span class="team-score-name">ทีม ${team.teamNumber}</span>
            <span class="team-score-value">${team.score} แต้ม</span>
        `;
        
        scoreList.appendChild(teamItem);
    });
}

// Update roll button state
function updateRollButtonState() {
    const rollBtn = document.getElementById('rollDiceBtn');
    if (rollBtn) {
        rollBtn.disabled = !gameState.selectedCard;
    }
}

// Render dice results (normal mode)
function renderDiceResults(result) {
    const diceDisplay = document.getElementById('diceDisplay');
    const diceResults = document.getElementById('diceResults');
    const diceSum = document.getElementById('diceSum');
    
    if (!diceDisplay || !diceResults || !diceSum) return;
    
    diceDisplay.style.display = 'block';
    diceResults.innerHTML = '';
    
    result.dice.forEach((die, index) => {
        const dieElement = document.createElement('div');
        dieElement.className = 'die';
        dieElement.textContent = die;
        dieElement.style.animationDelay = `${index * 0.1}s`;
        diceResults.appendChild(dieElement);
    });
    
    diceSum.textContent = `ผลรวม: ${result.sum}`;
}

// Show card match result
function showCardMatch(matches) {
    const diceDisplay = document.getElementById('diceDisplay');
    if (!diceDisplay) return;
    
    if (matches) {
        diceDisplay.classList.add('match-success');
        diceDisplay.classList.remove('match-fail');
    } else {
        diceDisplay.classList.add('match-fail');
        diceDisplay.classList.remove('match-success');
    }
    
    // Remove classes after animation
    setTimeout(() => {
        diceDisplay.classList.remove('match-success', 'match-fail');
    }, 2000);
}


// Update player count display (host mode)
function updatePlayerCountDisplay() {
    const playerCountDisplay = document.getElementById('playerCountDisplay');
    const cardPointsDisplay = document.getElementById('cardPointsDisplay');
    const calculatedPoints = document.getElementById('calculatedPoints');
    
    if (playerCountDisplay) {
        playerCountDisplay.textContent = gameState.playerCount;
    }
    
    if (cardPointsDisplay && gameState.selectedCard) {
        cardPointsDisplay.textContent = gameState.selectedCard.points;
    } else if (cardPointsDisplay) {
        cardPointsDisplay.textContent = '0';
    }
    
    if (calculatedPoints) {
        const points = gameState.calculateScore();
        calculatedPoints.textContent = points;
    }
}

// Update add score button state (team mode)
function updateAddScoreButtonState() {
    const addScoreBtn = document.getElementById('addScoreBtn');
    if (!addScoreBtn) return;
    
    const hasSelectedCard = gameState.selectedCard !== null;
    const cardNotUsed = gameState.selectedCard ? !gameState.isCardUsed(gameState.selectedCard.id) : false;
    
    // Allow saving even with 0 score (when no players matched the condition)
    addScoreBtn.disabled = !(hasSelectedCard && cardNotUsed);
}

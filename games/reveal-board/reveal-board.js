// Reveal Board Game JavaScript
// A guessing game where players reveal tiles to identify features

class RevealBoardGame {
    constructor() {
        this.uploadedImages = [];
        this.currentImageIndex = 0;
        this.rows = 5;
        this.columns = 8;
        this.totalTiles = 0;
        this.revealedTiles = 0;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.imageUpload = document.getElementById('imageUpload');
        this.imageCount = document.getElementById('imageCount');
        this.rowsInput = document.getElementById('rows');
        this.columnsInput = document.getElementById('columns');
        this.boardContainer = document.getElementById('boardContainer');
        this.imagePreview = document.getElementById('imagePreview');
        this.tilesOverlay = document.getElementById('tilesOverlay');
        this.placeholder = document.getElementById('placeholder');
        this.statsPanel = document.getElementById('statsPanel');
        this.resetBtn = document.getElementById('resetBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        
        // Stats elements
        this.currentImageNumEl = document.getElementById('currentImageNum');
        this.totalTilesEl = document.getElementById('totalTiles');
        this.revealedCountEl = document.getElementById('revealedCount');
        this.remainingCountEl = document.getElementById('remainingCount');

        // Fullscreen state
        this.isFullscreen = false;

        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();
            // Adjust container class when fullscreen is toggled
            if (!this.isFullscreen) {
                this.boardContainer.classList.remove('fullscreen');
            }
        });
    }

    setupEventListeners() {
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
    }

    handleImageUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        this.uploadedImages = [];
        this.currentImageIndex = 0;
        let loadedCount = 0;

        // Read all uploaded images
        Array.from(files).forEach((file, index) => {
            // Validate file type
            if (!file.type.match('image/(jpeg|jpg|png|webp)')) {
                alert(`File ${file.name} is not a valid image (JPG, PNG, or WebP)`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.uploadedImages.push(e.target.result);
                loadedCount++;

                // When all images are loaded
                if (loadedCount === files.length) {
                    this.imageCount.textContent = `${this.uploadedImages.length} image(s) uploaded`;
                    console.log(`${this.uploadedImages.length} images loaded successfully`);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    createBoard() {
        // Validate inputs
        if (!this.uploadedImages || this.uploadedImages.length === 0) {
            alert('Please upload at least one image first!');
            return;
        }

        this.rows = parseInt(this.rowsInput.value);
        this.columns = parseInt(this.columnsInput.value);

        if (this.rows < 1 || this.rows > 30 || this.columns < 1 || this.columns > 30) {
            alert('Please enter valid numbers for rows (1-30) and columns (1-30)');
            return;
        }

        this.totalTiles = this.rows * this.columns;
        this.revealedTiles = 0;
        this.currentImageIndex = 0;

        // Set the first image
        this.imagePreview.src = this.uploadedImages[this.currentImageIndex];

        // Hide placeholder and show board
        this.placeholder.style.display = 'none';
        this.boardContainer.classList.add('active');
        this.statsPanel.style.display = 'flex';
        this.resetBtn.disabled = false;
        
        // Enable next button if there are multiple images
        this.nextBtn.disabled = this.uploadedImages.length <= 1;
        this.fullscreenBtn.disabled = false;

        // Generate tiles
        this.generateTiles();
        this.updateStats();
    }

    generateTiles() {
        // Clear existing tiles
        this.tilesOverlay.innerHTML = '';

        // Set grid template
        this.tilesOverlay.style.gridTemplateRows = `repeat(${this.rows}, 1fr)`;
        this.tilesOverlay.style.gridTemplateColumns = `repeat(${this.columns}, 1fr)`;

        // Compute a font size that scales with grid density
        const maxGrid = Math.max(this.rows, this.columns);
        const fontSize = Math.max(10, Math.min(28, Math.floor(220 / maxGrid)));

        // Create tiles
        let tileNumber = 1;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.row = row;
                tile.dataset.col = col;
                tile.dataset.number = tileNumber;
                
                tile.textContent = tileNumber;
                tile.style.fontSize = `${fontSize}px`;
                
                tile.addEventListener('click', () => this.revealTile(tile));
                
                this.tilesOverlay.appendChild(tile);
                tileNumber++;
            }
        }
    }

    revealTile(tile) {
        if (tile.classList.contains('revealed')) {
            return;
        }

        // Animate and reveal
        tile.classList.add('revealed');
        this.revealedTiles++;
        this.updateStats();

        // Check if all tiles are revealed
        if (this.revealedTiles === this.totalTiles) {
            setTimeout(() => {
                alert('🎉 All tiles revealed! Did you guess the feature?');
            }, 500);
        }
    }

    resetBoard() {
        // Remove revealed class from all tiles
        const tiles = this.tilesOverlay.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.classList.remove('revealed');
        });

        this.revealedTiles = 0;
        this.updateStats();
    }

    nextImage() {
        if (this.currentImageIndex >= this.uploadedImages.length - 1) {
            alert('🎉 You\'ve completed all images!');
            return;
        }

        // Move to next image
        this.currentImageIndex++;
        this.imagePreview.src = this.uploadedImages[this.currentImageIndex];

        // Reset tiles for new round
        this.revealedTiles = 0;
        const tiles = this.tilesOverlay.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.classList.remove('revealed');
        });

        // Update stats
        this.updateStats();

        // Disable next button if this is the last image
        if (this.currentImageIndex >= this.uploadedImages.length - 1) {
            this.nextBtn.disabled = true;
        }
    }

    updateStats() {
        this.currentImageNumEl.textContent = `${this.currentImageIndex + 1} / ${this.uploadedImages.length}`;
        this.totalTilesEl.textContent = this.totalTiles;
        this.revealedCountEl.textContent = this.revealedTiles;
        this.remainingCountEl.textContent = this.totalTiles - this.revealedTiles;
    }

    async toggleFullscreen() {
        if (!this.boardContainer) return;

        try {
            if (!document.fullscreenElement) {
                await this.boardContainer.requestFullscreen();
                this.boardContainer.classList.add('fullscreen');
                this.isFullscreen = true;
            } else {
                await document.exitFullscreen();
                this.boardContainer.classList.remove('fullscreen');
                this.isFullscreen = false;
            }
        } catch (error) {
            console.error('Fullscreen toggle failed:', error);
            alert('Fullscreen is not supported or was blocked by the browser.');
        } finally {
            this.updateFullscreenButton();
        }
    }

    updateFullscreenButton() {
        if (!this.fullscreenBtn) return;
        this.fullscreenBtn.textContent = this.isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen';
    }
}

// Global game instance
let game;

// Initialize game when page loads
window.addEventListener('load', function () {
    game = new RevealBoardGame();
});

// Global functions for HTML onclick handlers
function createBoard() {
    game.createBoard();
}

function resetBoard() {
    game.resetBoard();
}

function nextImage() {
    game.nextImage();
}

function toggleFullscreen() {
    game.toggleFullscreen();
}


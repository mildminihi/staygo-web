// Reveal Board Game JavaScript
// A guessing game where players reveal tiles to identify features

const LANG_STORAGE_KEY = "staygo.revealBoard.lang";

const I18N = {
    th: {
        pageTitle: "เปิดแผ่นป้าย",
        title: "เปิดแผ่นป้าย",
        subtitle: "อัปโหลดรูป แล้วกด สร้างกระดาน เพื่อเริ่มเล่น",
        labelUpload: "📁 อัปโหลดรูป:",
        labelRows: "📊 แถว (1-30):",
        labelCols: "📐 คอลัมน์ (1-30):",

        btnCreate: "🎮 สร้างกระดาน",
        btnReset: "🔄 รีเซ็ต",
        btnRevealAll: "👁️ เปิดทั้งหมด",
        btnNext: "➡️ รูปถัดไป",
        btnFullscreenEnter: "⛶ เต็มจอ",
        btnFullscreenExit: "⛶ ออกจากเต็มจอ",
        btnReload: "⟳ โหลดใหม่",

        statCurrent: "รูปปัจจุบัน",
        statTotal: "จำนวนช่องทั้งหมด",
        statRevealed: "เปิดแล้ว",
        statRemaining: "เหลือ",

        placeholder: "📸 อัปโหลดรูปอย่างน้อย 1 รูป แล้วกด Create Board เพื่อเริ่มเล่น",
        imageCount: (n) => `${n} รูป (อัปโหลดแล้ว)` ,

        errInvalidImageType: (name) => `ไฟล์ ${name} ไม่ใช่รูปที่รองรับ (JPG, PNG หรือ WebP)`,
        errNeedUpload: "กรุณาอัปโหลดรูปอย่างน้อย 1 รูปก่อน!",
        errInvalidGrid: "กรุณาใส่จำนวนแถว/คอลัมน์ที่ถูกต้อง (1-30)",
        doneAllTiles: "🎉 เปิดครบทุกช่องแล้ว! เดาถูกไหม?",
        doneAllImages: "🎉 เล่นครบทุกภาพแล้ว!",
        errFullscreen: "โหมดเต็มจอไม่รองรับ หรือถูกบล็อกโดยเบราว์เซอร์",

        rulesHtml: `
            <h3>🎯 วิธีเล่น Reveal Board</h3>
            <p><strong>เกมทายภาพ: ค่อย ๆ เปิดช่องเพื่อเดาว่ารูปคืออะไร!</strong></p>
            <ul>
                <li><strong>เริ่มต้น:</strong> คนคุมเกมอัปโหลดรูป 1 รูปหรือหลายรูป</li>
                <li><strong>ตั้งค่ากริด:</strong> เลือกจำนวนแถวและคอลัมน์ (สูงสุด 30×30)</li>
                <li><strong>สร้างบอร์ด:</strong> ระบบจะวางช่องปิดทับรูปอัตโนมัติ</li>
                <li><strong>เล่น:</strong> ผู้เล่นผลัดกันกดช่องเพื่อเปิดบางส่วนของรูป</li>
                <li><strong>เดา:</strong> หลังเปิดแต่ละครั้ง ลองเดาว่ารูปคืออะไร</li>
                <li><strong>ชนะ:</strong> เดาถูกก่อนที่จะเปิดครบทุกช่อง</li>
                <li><strong>รีเซ็ต:</strong> กดรีเซ็ตเพื่อปิดช่องกลับมาใหม่</li>
                <li><strong>หลายรอบ:</strong> ถ้าอัปโหลดหลายรูป กด “รูปถัดไป” เพื่อไปภาพถัดไป</li>
            </ul>
            <p><strong>💡 ทิป:</strong></p>
            <ul>
                <li>เริ่มด้วยกริดน้อย ๆ (เช่น 5×8) เล่นง่ายขึ้น</li>
                <li>เพิ่มกริดใหญ่ (เช่น 20×30) ให้ท้าทายขึ้น</li>
                <li>เหมาะสำหรับเล่นกับเพื่อน/ทีม และกิจกรรมบนไลฟ์</li>
            </ul>
        `,
    },
    en: {
        pageTitle: "Reveal Board",
        title: "Reveal Board",
        subtitle: "Upload images, then press Create Board to start",
        labelUpload: "📁 Upload images:",
        labelRows: "📊 Rows (1-30):",
        labelCols: "📐 Columns (1-30):",

        btnCreate: "🎮 Create Board",
        btnReset: "🔄 Reset",
        btnRevealAll: "👁️ Reveal All",
        btnNext: "➡️ Next Image",
        btnFullscreenEnter: "⛶ Fullscreen",
        btnFullscreenExit: "⛶ Exit Fullscreen",
        btnReload: "⟳ Reload Page",

        statCurrent: "Current Image",
        statTotal: "Total Tiles",
        statRevealed: "Revealed",
        statRemaining: "Remaining",

        placeholder: "📸 Upload one or more photos and create a board to start playing!",
        imageCount: (n) => `${n} image(s) uploaded`,

        errInvalidImageType: (name) => `File ${name} is not a valid image (JPG, PNG, or WebP)`,
        errNeedUpload: "Please upload at least one image first!",
        errInvalidGrid: "Please enter valid numbers for rows (1-30) and columns (1-30)",
        doneAllTiles: "🎉 All tiles revealed! Did you guess the photo?",
        doneAllImages: "🎉 You've completed all images!",
        errFullscreen: "Fullscreen is not supported or was blocked by the browser.",

        rulesHtml: `
            <h3>🎯 How to Play Reveal Board</h3>
            <p><strong>A visual guessing game where everyone reveals tiles to identify the hidden photo!</strong></p>
            <ul>
                <li><strong>Setup:</strong> Host uploads one or more photos (anything fun)</li>
                <li><strong>Configure Grid:</strong> Choose rows and columns (max 30×30)</li>
                <li><strong>Create Board:</strong> Tiles automatically cover the photo</li>
                <li><strong>Play:</strong> Players take turns clicking tiles to reveal parts of the image</li>
                <li><strong>Guess:</strong> After each reveal, try to identify what the photo is</li>
                <li><strong>Win:</strong> Guess correctly before all tiles are revealed</li>
                <li><strong>Reset:</strong> Use Reset to cover the tiles again</li>
                <li><strong>Multiple Rounds:</strong> Upload multiple images and use Next Image</li>
            </ul>
            <p><strong>💡 Tips:</strong></p>
            <ul>
                <li>Start with fewer tiles (5×8) for easier games</li>
                <li>Use more tiles (20×30) for challenging rounds</li>
                <li>Great for live streams and group play</li>
            </ul>
        `,
    },
};

function normalizeLang(value) {
    return value === "en" ? "en" : "th";
}

function getCurrentLang() {
    const saved = (() => {
        try { return localStorage.getItem(LANG_STORAGE_KEY) || ""; } catch { return ""; }
    })();

    if (saved) return normalizeLang(saved);
    const docLang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    if (docLang.startsWith("en")) return "en";
    return "th";
}

function setCurrentLang(lang) {
    const normalized = normalizeLang(lang);
    try { localStorage.setItem(LANG_STORAGE_KEY, normalized); } catch { /* ignore */ }
    document.documentElement.setAttribute("lang", normalized);
    applyI18n(normalized);
}

function t(lang, key, ...args) {
    const pack = I18N[normalizeLang(lang)] || I18N.th;
    const value = pack[key];
    if (typeof value === "function") return value(...args);
    return typeof value === "string" ? value : "";
}

function applyI18n(lang) {
    const normalized = normalizeLang(lang);
    document.title = t(normalized, "pageTitle");

    // Update simple text nodes
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        const value = t(normalized, key);
        if (value) el.textContent = value;
    });

    // Update HTML blocks
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
        const key = el.getAttribute("data-i18n-html");
        if (!key) return;
        if (key === "rules") {
            el.innerHTML = t(normalized, "rulesHtml");
        }
    });

    // Buttons managed by JS state
    if (typeof game !== "undefined" && game && typeof game.updateFullscreenButton === "function") {
        game.updateFullscreenButton();
    }

    // Toggle UI state
    document.querySelectorAll(".lang-btn[data-lang]").forEach((btn) => {
        const btnLang = normalizeLang(btn.getAttribute("data-lang"));
        btn.classList.toggle("active", btnLang === normalized);
    });
}

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
        this.revealAllBtn = document.getElementById('revealAllBtn');
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

        // Language toggle (if present)
        document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang') || 'th';
                setCurrentLang(lang);
            });
        });
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
                const lang = getCurrentLang();
                alert(t(lang, 'errInvalidImageType', file.name));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.uploadedImages.push(e.target.result);
                loadedCount++;

                // When all images are loaded
                if (loadedCount === files.length) {
                    const lang = getCurrentLang();
                    this.imageCount.textContent = t(lang, 'imageCount', this.uploadedImages.length);
                    console.log(`${this.uploadedImages.length} images loaded successfully`);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    createBoard() {
        // Validate inputs
        if (!this.uploadedImages || this.uploadedImages.length === 0) {
            alert(t(getCurrentLang(), 'errNeedUpload'));
            return;
        }

        this.rows = parseInt(this.rowsInput.value);
        this.columns = parseInt(this.columnsInput.value);

        if (this.rows < 1 || this.rows > 30 || this.columns < 1 || this.columns > 30) {
            alert(t(getCurrentLang(), 'errInvalidGrid'));
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
        this.revealAllBtn.disabled = false;
        
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
                alert(t(getCurrentLang(), 'doneAllTiles'));
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

    revealAll() {
        // Reveal all tiles at once
        const tiles = this.tilesOverlay.querySelectorAll('.tile');
        tiles.forEach(tile => {
            if (!tile.classList.contains('revealed')) {
                tile.classList.add('revealed');
            }
        });

        this.revealedTiles = this.totalTiles;
        this.updateStats();

        // Show completion message after a short delay
        setTimeout(() => {
            alert(t(getCurrentLang(), 'doneAllTiles'));
        }, 500);
    }

    nextImage() {
        if (this.currentImageIndex >= this.uploadedImages.length - 1) {
            alert(t(getCurrentLang(), 'doneAllImages'));
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
            alert(t(getCurrentLang(), 'errFullscreen'));
        } finally {
            this.updateFullscreenButton();
        }
    }

    updateFullscreenButton() {
        if (!this.fullscreenBtn) return;
        const lang = getCurrentLang();
        this.fullscreenBtn.textContent = this.isFullscreen ? t(lang, 'btnFullscreenExit') : t(lang, 'btnFullscreenEnter');
    }
}

// Global game instance
let game;

// Initialize game when page loads
window.addEventListener('load', function () {
    game = new RevealBoardGame();

    // Initial language apply
    applyI18n(getCurrentLang());
});

// Global functions for HTML onclick handlers
function createBoard() {
    game.createBoard();
}

function resetBoard() {
    game.resetBoard();
}

function revealAll() {
    game.revealAll();
}

function nextImage() {
    game.nextImage();
}

function toggleFullscreen() {
    game.toggleFullscreen();
}

function nextImage() {
    game.nextImage();
}

function toggleFullscreen() {
    game.toggleFullscreen();
}


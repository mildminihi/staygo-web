// Seeded RNG (mulberry32)
// Provides deterministic random number generation for replay capability

class SeededRNG {
    constructor(seed) {
        // If no seed provided, generate one from current time
        this.seed = seed !== undefined ? seed : Date.now();
        this.originalSeed = this.seed;
        this.state = this.seed;
    }

    // mulberry32 - Fast, high-quality seeded RNG
    random() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    // Get random integer between min (inclusive) and max (inclusive)
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    // Get random float between min and max
    randomFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    // Roll a die with specified sides (default d6)
    rollDie(sides = 6) {
        return this.randomInt(1, sides);
    }

    // Roll multiple dice
    rollDice(count, sides = 6) {
        const results = [];
        for (let i = 0; i < count; i++) {
            results.push(this.rollDie(sides));
        }
        return results;
    }

    // Choose random element from array
    choice(array) {
        if (!array || array.length === 0) return null;
        return array[this.randomInt(0, array.length - 1)];
    }

    // Shuffle array (Fisher-Yates)
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Get N random unique elements from array
    sample(array, count) {
        const shuffled = this.shuffle(array);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // Random chance (probability between 0 and 1)
    chance(probability) {
        return this.random() < probability;
    }

    // Reset to original seed
    reset() {
        this.state = this.originalSeed;
        this.seed = this.originalSeed;
    }

    // Get current seed for saving/replay
    getSeed() {
        return this.originalSeed;
    }

    // Set new seed
    setSeed(newSeed) {
        this.seed = newSeed;
        this.originalSeed = newSeed;
        this.state = newSeed;
    }

    // Generate string seed from number seed
    static seedToString(seed) {
        return seed.toString(36).toUpperCase();
    }

    // Parse string seed to number
    static stringToSeed(str) {
        if (!str || str.trim() === '') {
            return Date.now();
        }
        // Convert string to number using hash
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }
}

// Global RNG instance (will be initialized in game.js)
let gameRNG = null;

function initRNG(seed) {
    gameRNG = new SeededRNG(seed);
    return gameRNG;
}

function getRNG() {
    if (!gameRNG) {
        gameRNG = new SeededRNG();
    }
    return gameRNG;
}


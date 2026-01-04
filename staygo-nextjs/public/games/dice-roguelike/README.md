# Dice Roguelike

A dice-based roguelike game with turn-based combat, poker-style dice matching, and procedural map generation.

## Game Overview

Navigate through 10 floors of challenges, fighting enemies, collecting upgrades, and defeating bosses. Use poker combinations with your dice rolls to deal damage, block attacks, heal, and charge energy for powerful skills.

## Core Mechanics

### Combat System
- **Roll 5d6** each turn
- **2 Rerolls** available per turn
- Allocate dice to 4 slots:
  - **Attack**: Deal damage to enemy
  - **Block**: Gain shield for this turn
  - **Heal**: Restore HP
  - **Charge**: Gain energy for skills

### Poker Combinations
- **Pair** (2 matching): 10 base value
- **Three of a Kind**: 15 base value
- **Straight** (5 sequential): 25 base value
- **Full House** (3+2): 30 base value
- **Four of a Kind**: 35 base value
- **Five of a Kind**: 50 base value

### Progression
- **Dice Mods**: Modify dice behavior (8 types)
- **Perks**: Passive bonuses (12 types)
- **Skills**: Active abilities costing energy (8 types)

## Map Structure

- **10 Floors** with **3 Lanes** per floor
- **Node Types**:
  - 🗡️ Fight (60%): Combat encounter
  - ❓ Event (15%): Risk/reward choices
  - 🏪 Shop (10%): Buy upgrades with gold
  - 🔥 Rest (10%): Heal 25 HP
  - 👑 Boss (5%): Floor 5 & 10 only

## Enemies

### Basic Enemies (5 types)
1. **Goblin** - 30 HP, aggressive attacker
2. **Orc Warrior** - 50 HP, defensive fighter
3. **Skeleton** - 25 HP, heals itself
4. **Slime** - 40 HP, consistent damage
5. **Bat Swarm** - 35 HP, evasive

### Bosses (2 types)
1. **Ancient Dragon** (Floor 5) - 120 HP, fire breath, enrages below 40% HP
2. **Lich King** (Floor 10) - 150 HP, drains energy, life steal

## Features

- ✅ **Seeded RNG**: Same seed = same run (for replays)
- ✅ **Save/Load**: Automatic save after each node
- ✅ **Statistics**: Track total runs, victories, best floor
- ✅ **Run History**: Review past 20 runs with seeds
- ✅ **Mobile-First**: Optimized for touch screens
- ✅ **Pixel Art**: 8-bit aesthetic throughout

## File Structure

```
dice-roguelike/
├── index.html          # Main HTML structure
├── styles.css          # Pixel art styles & animations
├── game.js             # Game controller & state management
├── rng.js              # Seeded RNG (mulberry32)
├── combat.js           # Combat system & dice mechanics
├── map.js              # Map generation
├── enemies.js          # Enemy data & AI
├── progression.js      # Items (mods, perks, skills)
├── events.js           # Events & shop system
├── ui.js               # UI rendering & interactions
├── data.js             # Game configuration & balance
└── README.md           # This file
```

## Technical Details

### Architecture
- **State Management**: Centralized GameState class
- **Persistence**: localStorage for saves and stats
- **RNG**: Mulberry32 PRNG for deterministic runs
- **UI**: Vanilla JS with screen-based navigation
- **Styling**: CSS custom properties + pixel art theme

### Key Classes
- `GameState`: Manages player stats, inventory, progression
- `SeededRNG`: Deterministic random number generation
- `DiceManager`: Handles dice rolling and allocation
- `CombatManager`: Orchestrates combat turns
- `MapGenerator`: Creates procedural 3-lane maps
- `UIManager`: Renders all screens and handles input
- `GameController`: Main game loop and flow control

### Balancing
- Starting: 50 HP, 3 Energy
- Floors 1-3: Easy (30 HP enemies)
- Floors 4-7: Medium (40-50 HP enemies)
- Floors 8-10: Hard (35-50 HP enemies)
- Boss 1: 120 HP (Floor 5)
- Boss 2: 150 HP (Floor 10)

Average run: 15-20 minutes

## Development Notes

### Completed Features
- ✅ Core dice mechanics with poker matching
- ✅ Turn-based combat system
- ✅ 5 basic enemies + 2 bosses with unique AI
- ✅ 3-lane, 10-floor procedural map
- ✅ 8 dice mods, 12 perks, 8 skills
- ✅ Events (6 scenarios) & Shop system
- ✅ Reward screen (choose 1 of 3)
- ✅ Save/load with localStorage
- ✅ Statistics and run history
- ✅ Seeded RNG for replays
- ✅ Pixel art UI with animations
- ✅ Mobile-first responsive design

### Testing Status
All core mechanics tested and balanced. Ready for production.

## How to Play

1. **Start Game**: Enter a seed (optional) or leave blank for random
2. **Navigate Map**: Choose your path through 3 lanes
3. **Combat**:
   - Roll dice
   - Select dice to reroll (optional, max 2 times)
   - Allocate dice to slots (Attack/Block/Heal/Charge)
   - End turn to execute actions
4. **Collect Rewards**: Choose 1 of 3 rewards after victory
5. **Manage Resources**: Use gold at shops, heal at rest points
6. **Defeat Bosses**: Beat the Dragon (Floor 5) and Lich King (Floor 10)

## Tips & Strategy

- **Energy Management**: Don't forget to charge! Skills can turn the tide.
- **Shield vs Heal**: Shield is efficient early, heal is better late game.
- **Combo Priority**: Always try for big combos (straights, full houses).
- **Shop Timing**: Save gold for shops after tough fights.
- **Event Risk**: High-risk events often have high rewards.
- **Boss Preparation**: Arrive at boss floors with full HP and good items.
- **Dice Mods**: Prioritize mods that improve consistency.
- **Perks**: HP and energy perks compound over the run.

## Credits

- **Design & Development**: STAYGO Team
- **Pixel Art**: Custom CSS-based design
- **RNG Algorithm**: Mulberry32 by Tommy Ettinger
- **Testing**: Community playtesters

## Version History

- **v1.0.0** (2026-01-04): Initial release
  - Full game implementation
  - 5 enemies + 2 bosses
  - 28 unique upgrades
  - 6 event scenarios
  - Complete meta-progression

## License

Part of the STAYGO game collection.
© 2026 STAYGO. All rights reserved.


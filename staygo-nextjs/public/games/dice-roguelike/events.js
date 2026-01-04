// Event System
// Event scenarios and outcomes

// Event database
const EVENTS = {
    mysteriousShrine: {
        id: 'mysteriousShrine',
        title: 'Mysterious Shrine',
        description: 'You encounter a glowing shrine. An ancient power emanates from it.',
        choices: [
            {
                text: 'Sacrifice 10 HP for a powerful blessing',
                requirement: (gs) => gs.player.hp > 10,
                outcome: (gs) => {
                    gs.takeDamage(10);
                    const rng = getRNG();
                    const perks = getRandomPerks(3);
                    const rarePerk = perks.find(p => p.rarity === 'rare') || perks[0];
                    gs.addPerk(rarePerk);
                    return {
                        success: true,
                        message: `You sacrificed 10 HP and received: ${rarePerk.name}`,
                        reward: rarePerk
                    };
                }
            },
            {
                text: 'Pray for gold',
                requirement: () => true,
                outcome: (gs) => {
                    const rng = getRNG();
                    const gold = rng.randomInt(20, 40);
                    gs.addGold(gold);
                    return {
                        success: true,
                        message: `You receive ${gold} gold from the shrine.`
                    };
                }
            },
            {
                text: 'Leave the shrine alone',
                requirement: () => true,
                outcome: (gs) => {
                    return {
                        success: true,
                        message: 'You decide not to tempt fate and move on.'
                    };
                }
            }
        ]
    },

    travelingMerchant: {
        id: 'travelingMerchant',
        title: 'Traveling Merchant',
        description: 'A mysterious merchant offers you a deal.',
        choices: [
            {
                text: 'Buy a Dice Mod for 50 gold',
                requirement: (gs) => gs.player.gold >= 50,
                outcome: (gs) => {
                    gs.spendGold(50);
                    const mod = getRandomDiceMods(1)[0];
                    gs.addDiceMod(mod);
                    return {
                        success: true,
                        message: `You bought: ${mod.name}`,
                        reward: mod
                    };
                }
            },
            {
                text: 'Sell a random perk for 30 gold',
                requirement: (gs) => gs.perks.length > 0,
                outcome: (gs) => {
                    const rng = getRNG();
                    const index = rng.randomInt(0, gs.perks.length - 1);
                    const soldPerk = gs.perks.splice(index, 1)[0];
                    gs.addGold(30);
                    return {
                        success: true,
                        message: `You sold ${soldPerk.name} for 30 gold.`
                    };
                }
            },
            {
                text: 'Move on',
                requirement: () => true,
                outcome: (gs) => {
                    return {
                        success: true,
                        message: 'You decline the merchant\'s offer.'
                    };
                }
            }
        ]
    },

    magicFountain: {
        id: 'magicFountain',
        title: 'Magic Fountain',
        description: 'A fountain of magical water bubbles before you.',
        choices: [
            {
                text: 'Drink deeply (Heal 20 HP, lose 1 Energy)',
                requirement: (gs) => gs.player.energy > 1,
                outcome: (gs) => {
                    gs.heal(20);
                    gs.player.energy = Math.max(0, gs.player.energy - 1);
                    return {
                        success: true,
                        message: 'You feel refreshed but slightly drained. +20 HP, -1 Energy'
                    };
                }
            },
            {
                text: 'Meditate by the fountain (Gain 2 Energy, lose 10 HP)',
                requirement: (gs) => gs.player.hp > 10,
                outcome: (gs) => {
                    gs.takeDamage(10);
                    gs.addEnergy(2);
                    return {
                        success: true,
                        message: 'You feel energized but weakened. +2 Energy, -10 HP'
                    };
                }
            },
            {
                text: 'Don\'t interact with the fountain',
                requirement: () => true,
                outcome: (gs) => {
                    return {
                        success: true,
                        message: 'You walk past the fountain.'
                    };
                }
            }
        ]
    },

    treasureChest: {
        id: 'treasureChest',
        title: 'Treasure Chest',
        description: 'You find a locked treasure chest. It might be trapped...',
        choices: [
            {
                text: 'Pay 20 gold to safely unlock it',
                requirement: (gs) => gs.player.gold >= 20,
                outcome: (gs) => {
                    gs.spendGold(20);
                    const mod = getRandomDiceMods(1)[0];
                    gs.addDiceMod(mod);
                    return {
                        success: true,
                        message: `You safely unlock the chest and find: ${mod.name}`,
                        reward: mod
                    };
                }
            },
            {
                text: 'Try to force it open (50% chance of trap for 10 damage)',
                requirement: () => true,
                outcome: (gs) => {
                    const rng = getRNG();
                    if (rng.chance(0.5)) {
                        // Trapped!
                        gs.takeDamage(10);
                        return {
                            success: false,
                            message: 'The chest was trapped! You take 10 damage.'
                        };
                    } else {
                        // Success!
                        const mod = getRandomDiceMods(1)[0];
                        gs.addDiceMod(mod);
                        return {
                            success: true,
                            message: `You successfully open the chest and find: ${mod.name}`,
                            reward: mod
                        };
                    }
                }
            },
            {
                text: 'Leave it alone',
                requirement: () => true,
                outcome: (gs) => {
                    return {
                        success: true,
                        message: 'Better safe than sorry. You leave the chest.'
                    };
                }
            }
        ]
    },

    strangePotion: {
        id: 'strangePotion',
        title: 'Strange Potion',
        description: 'You find a mysterious potion. What could it do?',
        choices: [
            {
                text: 'Drink it!',
                requirement: () => true,
                outcome: (gs) => {
                    const rng = getRNG();
                    const effects = [
                        { msg: 'You feel stronger! +15 Max HP', effect: () => { gs.player.maxHp += 15; gs.player.hp += 15; } },
                        { msg: 'You feel energized! +1 Max Energy', effect: () => { gs.player.maxEnergy += 1; gs.player.energy += 1; } },
                        { msg: 'It was poison! -15 HP', effect: () => { gs.takeDamage(15); } },
                        { msg: 'You gain 50 gold!', effect: () => { gs.addGold(50); } },
                        { msg: 'Nothing happens...', effect: () => {} }
                    ];
                    
                    const result = rng.choice(effects);
                    result.effect();
                    
                    return {
                        success: true,
                        message: result.msg
                    };
                }
            },
            {
                text: 'Leave it alone',
                requirement: () => true,
                outcome: (gs) => {
                    return {
                        success: true,
                        message: 'You decide not to risk it.'
                    };
                }
            }
        ]
    },

    restingPlace: {
        id: 'restingPlace',
        title: 'Peaceful Clearing',
        description: 'A quiet spot perfect for resting.',
        choices: [
            {
                text: 'Rest and recover (Heal 15 HP)',
                requirement: () => true,
                outcome: (gs) => {
                    gs.heal(15);
                    return {
                        success: true,
                        message: 'You rest for a while. +15 HP'
                    };
                }
            },
            {
                text: 'Train with your dice (Get random Dice Mod, lose 5 HP)',
                requirement: (gs) => gs.player.hp > 5,
                outcome: (gs) => {
                    gs.takeDamage(5);
                    const mod = getRandomDiceMods(1)[0];
                    gs.addDiceMod(mod);
                    return {
                        success: true,
                        message: `Training pays off! Learned: ${mod.name}. -5 HP`,
                        reward: mod
                    };
                }
            },
            {
                text: 'Move on',
                requirement: () => true,
                outcome: (gs) => {
                    return {
                        success: true,
                        message: 'You continue your journey.'
                    };
                }
            }
        ]
    }
};

// Get random event
function getRandomEvent() {
    const rng = getRNG();
    const eventList = Object.values(EVENTS);
    return rng.choice(eventList);
}

// Get event by ID
function getEventById(id) {
    return EVENTS[id] || null;
}

// Execute event choice
function executeEventChoice(event, choiceIndex, gameState) {
    if (!event || !event.choices || choiceIndex < 0 || choiceIndex >= event.choices.length) {
        return null;
    }

    const choice = event.choices[choiceIndex];
    
    // Check requirement
    if (choice.requirement && !choice.requirement(gameState)) {
        return {
            success: false,
            message: 'You cannot choose this option.'
        };
    }

    // Execute outcome
    if (choice.outcome) {
        return choice.outcome(gameState);
    }

    return null;
}

// ========== SHOP SYSTEM ==========

// Shop item pricing
const SHOP_PRICES = {
    diceMod: 60,
    perk: 50,
    skill: 80,
    heal: 30,
    maxHp: 40
};

// Generate shop inventory
function generateShopInventory() {
    const rng = getRNG();
    const inventory = [];

    // 2 random dice mods
    inventory.push(...getRandomDiceMods(2).map(item => ({
        ...item,
        price: SHOP_PRICES.diceMod
    })));

    // 2 random perks
    inventory.push(...getRandomPerks(2).map(item => ({
        ...item,
        price: SHOP_PRICES.perk
    })));

    // 1 random skill
    inventory.push(...getRandomSkills(1).map(item => ({
        ...item,
        price: SHOP_PRICES.skill
    })));

    // Heal option
    inventory.push({
        id: 'shop_heal',
        name: 'Heal 20 HP',
        type: 'consumable',
        description: 'Restore 20 HP immediately',
        price: SHOP_PRICES.heal,
        effect: (gs) => gs.heal(20)
    });

    // Max HP increase
    inventory.push({
        id: 'shop_maxhp',
        name: '+10 Max HP',
        type: 'consumable',
        description: 'Permanently increase Max HP by 10',
        price: SHOP_PRICES.maxHp,
        effect: (gs) => {
            gs.player.maxHp += 10;
            gs.player.hp += 10;
        }
    });

    return inventory;
}

// Buy item from shop
function buyShopItem(item, gameState) {
    // Check if player has enough gold
    if (gameState.player.gold < item.price) {
        return {
            success: false,
            message: 'Not enough gold!'
        };
    }

    // Update stats (first purchase in shop)
    if (!gameState.stats.shopsVisited) {
        gameState.stats.shopsVisited = 0;
    }
    
    // Spend gold
    gameState.spendGold(item.price);

    // Add item or apply effect
    if (item.type === 'diceMod') {
        gameState.addDiceMod(item);
    } else if (item.type === 'perk') {
        gameState.addPerk(item);
    } else if (item.type === 'skill') {
        gameState.addSkill(item);
    } else if (item.type === 'consumable' && item.effect) {
        item.effect(gameState);
    }

    return {
        success: true,
        message: `Purchased: ${item.name}`
    };
}


(function () {
    'use strict';

    // ---------- Data ----------

    var HEROES = [
        { id: "squire", name: "Squire", icon: "🗡️", rarity: "common", atk: 10, hp: 46 },
        { id: "archer", name: "Archer", icon: "🏹", rarity: "common", atk: 14, hp: 32 },
        { id: "cleric", name: "Cleric", icon: "✨", rarity: "rare", atk: 8, hp: 54 },
        { id: "knight", name: "Knight", icon: "🛡️", rarity: "rare", atk: 13, hp: 72 },
        { id: "mage", name: "Mage", icon: "🔥", rarity: "epic", atk: 23, hp: 36 },
        { id: "shadow", name: "Shadowblade", icon: "🥷", rarity: "epic", atk: 28, hp: 30 },
        { id: "dragoon", name: "Dragoon", icon: "🐉", rarity: "legendary", atk: 36, hp: 62 },
        { id: "sorceress", name: "Sorceress Queen", icon: "👑", rarity: "legendary", atk: 42, hp: 48 },
    ];

    var RARITY_COLOR = {
        common: "#6B7280",
        rare: "#3B82F6",
        epic: "#9333EA",
        legendary: "#CA8A04",
    };
    var RARITY_WEIGHT = { common: 60, rare: 30, epic: 8, legendary: 2 };

    var SET_NAMES = {
        common: "Wanderer's Set",
        rare: "Guardian's Set",
        epic: "Ember Set",
        legendary: "Sovereign Set",
    };
    var SET_BONUS_PCT = { 2: 0.10, 3: 0.25 };

    var ITEM_TEMPLATES = [
        { id: "rusty_sword", name: "Rusty Sword", icon: "🗡️", slot: "weapon", rarity: "common", atk: 4, hp: 0 },
        { id: "iron_blade", name: "Iron Blade", icon: "⚔️", slot: "weapon", rarity: "rare", atk: 8, hp: 0 },
        { id: "flameblade", name: "Flameblade", icon: "🔪", slot: "weapon", rarity: "epic", atk: 14, hp: 0 },
        { id: "dragon_fang", name: "Dragon Fang", icon: "🦴", slot: "weapon", rarity: "legendary", atk: 22, hp: 0 },
        { id: "leather_vest", name: "Leather Vest", icon: "🧥", slot: "armor", rarity: "common", atk: 0, hp: 10 },
        { id: "chainmail", name: "Chainmail", icon: "🥋", slot: "armor", rarity: "rare", atk: 0, hp: 20 },
        { id: "plate_armor", name: "Plate Armor", icon: "🛡️", slot: "armor", rarity: "epic", atk: 0, hp: 34 },
        { id: "aegis", name: "Aegis of Kings", icon: "🏰", slot: "armor", rarity: "legendary", atk: 0, hp: 50 },
        { id: "lucky_charm", name: "Lucky Charm", icon: "🍀", slot: "accessory", rarity: "common", atk: 2, hp: 5 },
        { id: "ring_vigor", name: "Ring of Vigor", icon: "💍", slot: "accessory", rarity: "rare", atk: 4, hp: 10 },
        { id: "amulet_frost", name: "Amulet of Frost", icon: "❄️", slot: "accessory", rarity: "epic", atk: 7, hp: 16 },
        { id: "crown_ages", name: "Crown of Ages", icon: "👑", slot: "accessory", rarity: "legendary", atk: 10, hp: 24 },
    ];
    var SLOT_ICON = { weapon: "🗡️", armor: "🛡️", accessory: "💍" };

    var ENCHANT_MAX = 15;

    var SELL_VALUE = { common: 8, rare: 20, epic: 45, legendary: 90 };

    function sellPrice(item) {
        var tmpl = itemTemplateById(item.templateId);
        var base = SELL_VALUE[tmpl.rarity] || 5;
        return Math.round(base * (1 + item.enchant * 0.25));
    }

    var TABS = [
        { id: "dungeon", label: "Dungeon", icon: "⚔️" },
        { id: "heroes", label: "Heroes", icon: "📦" },
        { id: "items", label: "Items", icon: "🎒" },
        { id: "gacha", label: "Gacha", icon: "✨" },
    ];

    function heroById(id) {
        for (var i = 0; i < HEROES.length; i++) if (HEROES[i].id === id) return HEROES[i];
        return null;
    }

    function itemTemplateById(id) {
        for (var i = 0; i < ITEM_TEMPLATES.length; i++) if (ITEM_TEMPLATES[i].id === id) return ITEM_TEMPLATES[i];
        return null;
    }

    function rollRarity(forceEpicPlus) {
        if (forceEpicPlus) {
            return Math.random() < 0.2 ? "legendary" : "epic";
        }
        var r = Math.random() * 100;
        if (r < RARITY_WEIGHT.legendary) return "legendary";
        if (r < RARITY_WEIGHT.legendary + RARITY_WEIGHT.epic) return "epic";
        if (r < RARITY_WEIGHT.legendary + RARITY_WEIGHT.epic + RARITY_WEIGHT.rare) return "rare";
        return "common";
    }

    function pullOne(forceEpicPlus) {
        var rarity = rollRarity(forceEpicPlus);
        var pool = HEROES.filter(function (h) { return h.rarity === rarity; });
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function rollItemDrop(isBoss) {
        var dropChance = isBoss ? 1 : 0.35;
        if (Math.random() > dropChance) return null;
        var rarity = rollRarity(isBoss && Math.random() < 0.5);
        var pool = ITEM_TEMPLATES.filter(function (t) { return t.rarity === rarity; });
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function levelCost(level) {
        return 20 + (level - 1) * 15;
    }

    function enchantCost(enchant) {
        return 30 * (enchant + 1);
    }

    function enchantSuccessChance(enchant) {
        if (enchant < 4) return 1.0;
        if (enchant < 7) return 0.85;
        if (enchant < 10) return 0.65;
        if (enchant < 13) return 0.45;
        return 0.3;
    }

    function equipmentBonus(equipment, itemsByUid) {
        var atk = 0, hp = 0;
        ["weapon", "armor", "accessory"].forEach(function (slot) {
            var uid = equipment && equipment[slot];
            if (!uid) return;
            var item = itemsByUid[uid];
            if (!item) return;
            var tmpl = itemTemplateById(item.templateId);
            var mult = 1 + item.enchant * 0.15;
            atk += Math.round((tmpl.atk || 0) * mult);
            hp += Math.round((tmpl.hp || 0) * mult);
        });
        return { atk: atk, hp: hp };
    }

    function setBonusFor(equipment, itemsByUid) {
        if (!equipment) return null;
        var counts = {};
        ["weapon", "armor", "accessory"].forEach(function (slot) {
            var uid = equipment[slot];
            if (!uid) return;
            var item = itemsByUid[uid];
            if (!item) return;
            var tmpl = itemTemplateById(item.templateId);
            counts[tmpl.rarity] = (counts[tmpl.rarity] || 0) + 1;
        });
        var best = null;
        Object.keys(counts).forEach(function (rarity) {
            var count = counts[rarity];
            if (count >= 2 && (!best || count > best.count)) best = { rarity: rarity, count: count };
        });
        if (!best) return null;
        var pct = SET_BONUS_PCT[Math.min(best.count, 3)] || 0;
        return { rarity: best.rarity, count: best.count, pct: pct };
    }

    function heroPower(hero, level, equipment, itemsByUid) {
        var mult = 1 + (level - 1) * 0.15;
        var base = { atk: Math.round(hero.atk * mult), hp: Math.round(hero.hp * mult) };
        var gear = equipmentBonus(equipment, itemsByUid || {});
        var set = setBonusFor(equipment, itemsByUid || {});
        var atk = base.atk + gear.atk;
        var hp = base.hp + gear.hp;
        if (set) {
            atk = Math.round(atk * (1 + set.pct));
            hp = Math.round(hp * (1 + set.pct));
        }
        return { atk: atk, hp: hp, set: set };
    }

    function monsterFor(room) {
        var isBoss = room % 5 === 0;
        var base = 30 + room * 12;
        var hp = isBoss ? Math.round(base * 3.2) : base;
        var atk = Math.round((4 + room * 1.5) * (isBoss ? 1.8 : 1));
        var names = isBoss
            ? ["Warden of Bone", "The Hollow King", "Pit Wyrm", "Ashen Tyrant"]
            : ["Cave Rat", "Bandit", "Skeleton", "Slime", "Goblin Scout"];
        return {
            name: names[Math.floor(Math.random() * names.length)],
            icon: isBoss ? "💀" : "👾",
            hp: hp, maxHp: hp, atk: atk, isBoss: isBoss,
        };
    }

    // ---------- State ----------

    var PULL_COST = 100;

    function createInitialState() {
        return {
            tab: "dungeon",
            gold: 50,
            gems: 300,
            owned: {},
            team: [],
            pity: 0,
            lastPulls: [],
            room: 1,
            monster: monsterFor(1),
            teamHp: 0,
            running: false,
            log: [{ t: "sys", text: "You stand at the dungeon entrance. Recruit a team to begin." }],
            inventory: [],
            enchantFeedback: {},
            pendingSell: {},
            deepestRoom: 1,
            goldEarned: 0,
            totalRecruited: 0,
            heroesLost: 0,
            monstersDefeated: 0,
            gameOver: null,
        };
    }

    var state = createInitialState();

    var uidCounter = 0;
    function newUid() {
        uidCounter += 1;
        return "item_" + uidCounter;
    }

    var feedbackTimers = {};
    var pendingSellTimers = {};
    var tickTimer = null;

    function computeItemsByUid() {
        var map = {};
        state.inventory.forEach(function (it) { map[it.uid] = it; });
        return map;
    }

    function computeMaxTeamHp(itemsByUid) {
        return state.team.reduce(function (sum, id) {
            var o = state.owned[id];
            if (!o) return sum;
            return sum + heroPower(heroById(id), o.level, o.equipment, itemsByUid).hp;
        }, 0);
    }

    function computeTeamAtk(itemsByUid) {
        return state.team.reduce(function (sum, id) {
            var o = state.owned[id];
            if (!o) return sum;
            return sum + heroPower(heroById(id), o.level, o.equipment, itemsByUid).atk;
        }, 0);
    }

    function syncTeamHp() {
        var maxTeamHp = computeMaxTeamHp(computeItemsByUid());
        if (maxTeamHp > 0 && state.teamHp === 0) {
            state.teamHp = maxTeamHp;
        }
    }

    function addLog(text, t) {
        state.log = state.log.slice(-60);
        state.log.push({ t: t || "info", text: text });
    }

    // ---------- Actions ----------

    function doPull(count) {
        var cost = count === 1 ? 100 : 900;
        if (state.gems < cost) return;
        state.gems -= cost;
        var currentPity = state.pity;
        var results = [];
        for (var i = 0; i < count; i++) {
            currentPity++;
            var forcePity = currentPity >= 10;
            var hero = pullOne(forcePity);
            if (hero.rarity === "epic" || hero.rarity === "legendary") currentPity = 0;
            results.push(hero);
        }
        state.pity = currentPity;
        state.totalRecruited += count;
        results.forEach(function (h) {
            if (state.owned[h.id]) {
                state.owned[h.id].level += 1;
                state.owned[h.id].count += 1;
            } else {
                state.owned[h.id] = { level: 1, count: 1, equipment: { weapon: null, armor: null, accessory: null } };
            }
        });
        state.lastPulls = results;
        syncTeamHp();
        render();
    }

    function levelUp(id) {
        var o = state.owned[id];
        if (!o) return;
        var cost = levelCost(o.level);
        if (state.gold < cost) return;
        state.gold -= cost;
        o.level += 1;
        render();
    }

    function toggleTeam(id) {
        var idx = state.team.indexOf(id);
        if (idx !== -1) {
            state.team.splice(idx, 1);
        } else {
            if (state.team.length >= 3) return;
            state.team.push(id);
        }
        syncTeamHp();
        render();
    }

    function resetRun() {
        state.running = false;
        state.room = 1;
        state.monster = monsterFor(1);
        state.teamHp = computeMaxTeamHp(computeItemsByUid());
        addLog("🏕️ The party leaves the dungeon to rest and recover. No one is lost.", "sys");
        render();
    }

    function banishRandomHero() {
        if (state.team.length === 0) return null;
        var heroId = state.team[Math.floor(Math.random() * state.team.length)];
        var hero = heroById(heroId);

        state.team.splice(state.team.indexOf(heroId), 1);
        delete state.owned[heroId];
        state.inventory.forEach(function (item) {
            if (item.equippedTo === heroId) item.equippedTo = null;
        });
        state.heroesLost += 1;

        return hero;
    }

    function isSoftlocked() {
        return Object.keys(state.owned).length === 0 && state.gems < PULL_COST;
    }

    function startNewGame() {
        if (tickTimer) { clearTimeout(tickTimer); tickTimer = null; }
        Object.keys(feedbackTimers).forEach(function (uid) { clearTimeout(feedbackTimers[uid]); });
        feedbackTimers = {};
        Object.keys(pendingSellTimers).forEach(function (uid) { clearTimeout(pendingSellTimers[uid]); });
        pendingSellTimers = {};
        state = createInitialState();
        render();
    }

    function equipItem(uid, heroId) {
        var itemsByUid = computeItemsByUid();
        var item = itemsByUid[uid];
        if (!item) return;
        var tmpl = itemTemplateById(item.templateId);
        var slot = tmpl.slot;
        var heroOwned = state.owned[heroId];
        if (!heroOwned) return;
        var prevUid = heroOwned.equipment && heroOwned.equipment[slot];
        if (prevUid && prevUid !== uid) {
            var prevItem = itemsByUid[prevUid];
            if (prevItem) prevItem.equippedTo = null;
        }
        if (item.equippedTo && item.equippedTo !== heroId) {
            var otherHero = state.owned[item.equippedTo];
            if (otherHero) otherHero.equipment[tmpl.slot] = null;
        }
        heroOwned.equipment[slot] = uid;
        item.equippedTo = heroId;
        render();
    }

    function unequipItem(uid) {
        var itemsByUid = computeItemsByUid();
        var item = itemsByUid[uid];
        if (!item || !item.equippedTo) return;
        var tmpl = itemTemplateById(item.templateId);
        var hero = state.owned[item.equippedTo];
        if (hero) hero.equipment[tmpl.slot] = null;
        item.equippedTo = null;
        render();
    }

    function requestSell(uid) {
        if (pendingSellTimers[uid]) clearTimeout(pendingSellTimers[uid]);
        state.pendingSell[uid] = true;
        pendingSellTimers[uid] = setTimeout(function () {
            delete state.pendingSell[uid];
            delete pendingSellTimers[uid];
            render();
        }, 4000);
        render();
    }

    function cancelSell(uid) {
        if (pendingSellTimers[uid]) { clearTimeout(pendingSellTimers[uid]); delete pendingSellTimers[uid]; }
        delete state.pendingSell[uid];
        render();
    }

    function confirmSell(uid) {
        var itemsByUid = computeItemsByUid();
        var item = itemsByUid[uid];
        if (!item) return;
        if (pendingSellTimers[uid]) { clearTimeout(pendingSellTimers[uid]); delete pendingSellTimers[uid]; }
        delete state.pendingSell[uid];

        var tmpl = itemTemplateById(item.templateId);
        if (item.equippedTo) {
            var hero = state.owned[item.equippedTo];
            if (hero) hero.equipment[tmpl.slot] = null;
        }
        var price = sellPrice(item);
        state.gold += price;

        var idx = -1;
        for (var i = 0; i < state.inventory.length; i++) {
            if (state.inventory[i].uid === uid) { idx = i; break; }
        }
        if (idx !== -1) state.inventory.splice(idx, 1);

        addLog("💰 Sold " + tmpl.name + " +" + item.enchant + " for " + price + " gold.", "sys");
        render();
    }

    function doEnchant(uid) {
        var itemsByUid = computeItemsByUid();
        var item = itemsByUid[uid];
        if (!item || item.enchant >= ENCHANT_MAX) return;
        var cost = enchantCost(item.enchant);
        if (state.gold < cost) return;
        state.gold -= cost;

        var chance = enchantSuccessChance(item.enchant);
        var success = Math.random() < chance;
        var willDowngrade = !success && item.enchant >= 7;
        var newEnchant = success ? item.enchant + 1 : (willDowngrade ? Math.max(0, item.enchant - 1) : item.enchant);
        item.enchant = newEnchant;

        var feedback = success
            ? { ok: true, msg: "Success — now +" + newEnchant }
            : (willDowngrade
                ? { ok: false, msg: "Failed — weakened to +" + newEnchant }
                : { ok: false, msg: "Failed — no change" });

        state.enchantFeedback[uid] = feedback;
        if (feedbackTimers[uid]) clearTimeout(feedbackTimers[uid]);
        feedbackTimers[uid] = setTimeout(function () {
            delete state.enchantFeedback[uid];
            render();
        }, 2500);

        render();
    }

    function runTick() {
        var itemsByUid = computeItemsByUid();
        var teamAtk = computeTeamAtk(itemsByUid);
        var maxTeamHp = computeMaxTeamHp(itemsByUid);
        var variance = function () { return 0.85 + Math.random() * 0.3; };
        var dmgToMonster = Math.max(1, Math.round(teamAtk * variance()));
        var dmgToTeam = Math.max(1, Math.round(state.monster.atk * variance()));
        var m = state.monster;

        addLog("Room " + state.room + " — party hits " + m.name + " for " + dmgToMonster, "atk");
        var nextMonsterHp = m.hp - dmgToMonster;
        if (nextMonsterHp <= 0) {
            var goldReward = 10 + state.room * 3;
            var gemReward = m.isBoss ? 15 : (Math.random() < 0.25 ? 2 : 0);
            state.gold += goldReward;
            state.goldEarned += goldReward;
            state.monstersDefeated += 1;
            if (gemReward) state.gems += gemReward;
            var dropTmpl = rollItemDrop(m.isBoss);
            var rewardText = m.name + " falls. +" + goldReward + " gold" + (gemReward ? (", +" + gemReward + " gems") : "");
            if (dropTmpl) {
                var uid = newUid();
                state.inventory.push({ uid: uid, templateId: dropTmpl.id, enchant: 0, equippedTo: null });
                rewardText += " — found " + dropTmpl.name + "!";
            }
            addLog(rewardText, "win");
            state.teamHp = Math.min(maxTeamHp, state.teamHp + Math.round(maxTeamHp * 0.15));
            var nextRoom = state.room + 1;
            state.room = nextRoom;
            state.deepestRoom = Math.max(state.deepestRoom, nextRoom);
            state.monster = monsterFor(nextRoom);
        } else {
            state.monster = Object.assign({}, m, { hp: nextMonsterHp });
        }

        addLog(m.name + " strikes the party for " + dmgToTeam, "dmg");
        var nextTeamHp = state.teamHp - dmgToTeam;
        if (nextTeamHp <= 0) {
            addLog("The party is overwhelmed. Retreating to room 1.", "defeat");
            var banished = banishRandomHero();
            if (banished) {
                addLog("💀 " + banished.name + " was lost to the dungeon. The ledger closes their page.", "defeat");
            }
            state.room = 1;
            state.monster = monsterFor(1);
            state.running = false;
            state.teamHp = computeMaxTeamHp(computeItemsByUid());
            state.gameOver = banished ? { name: banished.name, icon: banished.icon } : { name: null, icon: "💀" };
        } else {
            state.teamHp = nextTeamHp;
        }

        render();
    }

    function ensureTick() {
        var shouldRun = state.running && state.team.length > 0 && state.teamHp > 0;
        if (shouldRun && !tickTimer) {
            tickTimer = setTimeout(function () {
                tickTimer = null;
                runTick();
            }, 1000);
        } else if (!shouldRun && tickTimer) {
            clearTimeout(tickTimer);
            tickTimer = null;
        }
    }

    // ---------- Render ----------

    function esc(str) {
        var div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function renderHeader() {
        return (
            '<div class="dl-header">' +
                '<div>' +
                    '<div class="dl-header-title">DUNGEON LEDGER</div>' +
                    '<div class="dl-header-sub mono">depth ' + state.room + ' · a record kept in blood and ink</div>' +
                '</div>' +
            '</div>'
        );
    }

    function renderTopbar() {
        return (
            '<div class="dl-topbar mono">' +
                '<div class="dl-topbar-item">🪙 ' + state.gold + '</div>' +
                '<div class="dl-topbar-item">💎 ' + state.gems + '</div>' +
                '<div class="dl-topbar-item">👥 ' + state.team.length + '/3</div>' +
                '<div class="dl-topbar-item">🎒 ' + state.inventory.length + '</div>' +
            '</div>'
        );
    }

    function renderTabs() {
        return (
            '<div class="dl-tabs">' +
            TABS.map(function (t) {
                return '<button class="dl-tab ' + (state.tab === t.id ? 'active' : '') + '" data-action="tab" data-tab="' + t.id + '">' +
                    t.icon + ' ' + t.label.toUpperCase() +
                    '</button>';
            }).join('') +
            '</div>'
        );
    }

    function renderDungeonTab() {
        var itemsByUid = computeItemsByUid();
        var maxTeamHp = computeMaxTeamHp(itemsByUid);
        var hpPct = maxTeamHp > 0 ? Math.max(0, Math.round((state.teamHp / maxTeamHp) * 100)) : 0;
        var monster = state.monster;
        var monsterHpPct = Math.max(0, Math.round((monster.hp / monster.maxHp) * 100));

        var teamIcons = state.team.length === 0
            ? '<span class="dl-empty-note">No heroes assigned — visit Heroes tab</span>'
            : state.team.map(function (id) { return '<span>' + heroById(id).icon + '</span>'; }).join('');

        var logHtml = state.log.map(function (l) {
            return '<div class="dl-log-entry log-' + l.t + '">' + esc(l.text) + '</div>';
        }).join('');

        return (
            '<div class="dl-panel">' +
                '<div class="dl-row-between">' +
                    '<div class="dl-monster-info">' +
                        '<span class="dl-monster-emoji">' + monster.icon + '</span>' +
                        '<div>' +
                            '<div class="dl-monster-name">' + monster.name + '</div>' +
                            '<div class="dl-monster-meta">ATK ' + monster.atk + (monster.isBoss ? ' · BOSS' : '') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="dl-hp-value">' + Math.max(0, monster.hp) + '/' + monster.maxHp + '</div>' +
                '</div>' +
                '<div class="dl-bar"><div class="dl-bar-fill" style="width:' + monsterHpPct + '%;background:' + (monster.isBoss ? 'var(--dl-red)' : 'var(--dl-purple)') + ';"></div></div>' +
            '</div>' +

            '<div class="dl-panel">' +
                '<div class="dl-row-between">' +
                    '<div class="dl-team-icons">' + teamIcons + '</div>' +
                    '<div class="dl-hp-value">' + Math.max(0, state.teamHp) + '/' + maxTeamHp + '</div>' +
                '</div>' +
                '<div class="dl-bar"><div class="dl-bar-fill" style="width:' + hpPct + '%;background:var(--dl-green);"></div></div>' +
            '</div>' +

            '<div class="dl-log mono" id="dlLog">' + logHtml + '</div>' +

            '<div class="dl-note">⚠️ Losing a fight banishes a random hero from the party for good. Leave the dungeon between fights to heal up safely.</div>' +

            '<div class="dl-actions">' +
                '<button class="dl-btn dl-btn-primary" data-action="toggle-running" ' + (state.team.length === 0 ? 'disabled' : '') + '>' +
                    (state.running ? '⏸ Pause' : '▶ Auto-battle') +
                '</button>' +
                '<button class="dl-btn dl-btn-ghost" data-action="reset-run" title="Leave the dungeon and heal your party">🏕️ Leave</button>' +
            '</div>'
        );
    }

    function renderHeroesTab() {
        var itemsByUid = computeItemsByUid();
        var ids = Object.keys(state.owned);
        if (ids.length === 0) {
            return '<div class="dl-panel"><div class="dl-empty-note" style="text-align:center;padding:24px 0;">No heroes recruited yet. Pull the gacha to begin your roster.</div></div>';
        }
        return (
            '<div class="dl-hero-grid">' +
            ids.map(function (id) {
                var hero = heroById(id);
                var o = state.owned[id];
                var power = heroPower(hero, o.level, o.equipment, itemsByUid);
                var inTeam = state.team.indexOf(id) !== -1;
                var cost = levelCost(o.level);
                var setHtml = power.set
                    ? '<div class="dl-hero-set" style="color:' + RARITY_COLOR[power.set.rarity] + '">🔗 ' + SET_NAMES[power.set.rarity] + ' ' + power.set.count + '/3 · +' + Math.round(power.set.pct * 100) + '%</div>'
                    : '';
                var slotsHtml = ['weapon', 'armor', 'accessory'].map(function (slot) {
                    var uid = o.equipment && o.equipment[slot];
                    var item = uid ? itemsByUid[uid] : null;
                    var tmpl = item ? itemTemplateById(item.templateId) : null;
                    var title = tmpl ? (tmpl.name + ' +' + item.enchant) : ('no ' + slot);
                    return '<span class="dl-slot ' + (tmpl ? 'filled' : '') + '" title="' + esc(title) + '">' + (tmpl ? tmpl.icon : SLOT_ICON[slot]) + '</span>';
                }).join('');
                return (
                    '<div class="dl-hero-card ' + (inTeam ? 'in-team' : '') + '">' +
                        '<div class="dl-hero-card-head">' +
                            '<span class="dl-hero-emoji">' + hero.icon + '</span>' +
                            '<span class="dl-hero-rarity" style="color:' + RARITY_COLOR[hero.rarity] + '">' + hero.rarity + '</span>' +
                        '</div>' +
                        '<div class="dl-hero-name">' + hero.name + '</div>' +
                        '<div class="dl-hero-stat">Lv ' + o.level + ' · x' + o.count + '</div>' +
                        '<div class="dl-hero-stat">ATK ' + power.atk + ' · HP ' + power.hp + '</div>' +
                        setHtml +
                        '<div class="dl-hero-slots">' + slotsHtml + '</div>' +
                        '<div class="dl-hero-actions">' +
                            '<button class="dl-hero-assign-btn ' + (inTeam ? 'active' : '') + '" data-action="toggle-team" data-hero="' + id + '">' + (inTeam ? 'In team' : 'Assign') + '</button>' +
                            '<button class="dl-hero-level-btn" data-action="level-up" data-hero="' + id + '" ' + (state.gold < cost ? 'disabled' : '') + '>⬆ ' + cost + '</button>' +
                        '</div>' +
                    '</div>'
                );
            }).join('') +
            '</div>'
        );
    }

    function renderItemsTab() {
        if (state.inventory.length === 0) {
            return '<div class="dl-panel"><div class="dl-empty-note" style="text-align:center;padding:24px 0;">No items found yet. Defeat monsters in the dungeon for a chance to loot gear.</div></div>';
        }
        var ownedIds = Object.keys(state.owned);
        var itemsHtml = state.inventory.map(function (item) {
            var tmpl = itemTemplateById(item.templateId);
            var equippedHero = item.equippedTo ? heroById(item.equippedTo) : null;
            var eCost = enchantCost(item.enchant);
            var chance = enchantSuccessChance(item.enchant);
            var gearAtk = tmpl.atk ? Math.round(tmpl.atk * (1 + item.enchant * 0.15)) : 0;
            var gearHp = tmpl.hp ? Math.round(tmpl.hp * (1 + item.enchant * 0.15)) : 0;
            var feedback = state.enchantFeedback[item.uid];
            var maxed = item.enchant >= ENCHANT_MAX;
            var price = sellPrice(item);
            var sellPending = !!state.pendingSell[item.uid];

            var heroBtns = ownedIds.length === 0
                ? '<span class="dl-item-hero-hint">recruit heroes to equip</span>'
                : ownedIds.map(function (heroId) {
                    var hero = heroById(heroId);
                    var isEquippedHere = item.equippedTo === heroId;
                    return '<button class="dl-item-hero-btn ' + (isEquippedHere ? 'equipped' : '') + '" data-action="equip-toggle" data-uid="' + item.uid + '" data-hero="' + heroId + '">' + hero.icon + (isEquippedHere ? ' ✖' : '') + '</button>';
                }).join('');

            return (
                '<div class="dl-item-card" style="border-color:' + RARITY_COLOR[tmpl.rarity] + '">' +
                    '<div class="dl-item-head">' +
                        '<div class="dl-item-icon-name">' +
                            '<span class="dl-item-emoji">' + tmpl.icon + '</span>' +
                            '<div>' +
                                '<div class="dl-item-name">' + tmpl.name + ' <span class="dl-item-enchant">+' + item.enchant + '</span></div>' +
                                '<div class="dl-item-rarity" style="color:' + RARITY_COLOR[tmpl.rarity] + '">' + tmpl.rarity + ' · ' + tmpl.slot + ' · ' + SET_NAMES[tmpl.rarity] + '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="dl-item-gear-stats">' +
                            (gearAtk > 0 ? '<div>+' + gearAtk + ' ATK</div>' : '') +
                            (gearHp > 0 ? '<div>+' + gearHp + ' HP</div>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div class="dl-item-row">' +
                        '<div class="dl-item-status">' + (equippedHero ? ('equipped: ' + equippedHero.name) : 'unequipped') + '</div>' +
                        '<div class="dl-item-row-actions">' +
                            '<button class="dl-enchant-btn" data-action="enchant" data-uid="' + item.uid + '" ' + ((state.gold < eCost || maxed) ? 'disabled' : '') + '>' +
                                '🔨 ' + (maxed ? 'maxed' : (eCost + 'g · ' + Math.round(chance * 100) + '%')) +
                            '</button>' +
                            (sellPending
                                ? '<button class="dl-sell-btn confirm" data-action="sell-confirm" data-uid="' + item.uid + '">✔ +' + price + 'g?</button>' +
                                  '<button class="dl-sell-btn cancel" data-action="sell-cancel" data-uid="' + item.uid + '">✕</button>'
                                : '<button class="dl-sell-btn" data-action="sell-request" data-uid="' + item.uid + '">💰 Sell ' + price + 'g</button>') +
                        '</div>' +
                    '</div>' +
                    (feedback ? '<div class="dl-enchant-feedback ' + (feedback.ok ? 'ok' : 'fail') + '">' + esc(feedback.msg) + '</div>' : '') +
                    '<div class="dl-item-hero-list">' + heroBtns + '</div>' +
                '</div>'
            );
        }).join('');

        return (
            '<div class="dl-note">Equip 2+ items of the same rarity on one hero for a set bonus. Enchanting is safe below +4 — risk of failure (and setback past +7) increases above that. Selling an item unequips and removes it for good — click Sell twice to confirm.</div>' +
            '<div class="dl-item-list">' + itemsHtml + '</div>'
        );
    }

    function renderGachaTab() {
        var pull1Disabled = state.gems < 100;
        var pull10Disabled = state.gems < 900;

        var pullsHtml = '';
        if (state.lastPulls.length > 0) {
            pullsHtml =
                '<div class="dl-pulls-panel">' +
                    '<div class="dl-pulls-title">Last summons</div>' +
                    '<div class="dl-pulls-grid">' +
                    state.lastPulls.map(function (h) {
                        return '<div class="dl-pull-card" style="border-color:' + RARITY_COLOR[h.rarity] + '">' +
                            '<span>' + h.icon + '</span>' +
                            '<span style="color:' + RARITY_COLOR[h.rarity] + '">' + h.name + '</span>' +
                        '</div>';
                    }).join('') +
                    '</div>' +
                '</div>';
        }

        return (
            '<div class="dl-panel dl-gacha-panel">' +
                '<div class="dl-gacha-title">RECRUITMENT RITE</div>' +
                '<div class="dl-gacha-sub">pity ' + state.pity + '/10 — guaranteed Epic+ at 10</div>' +
                '<div class="dl-gacha-actions">' +
                    '<button class="dl-gacha-btn" data-action="pull" data-count="1" ' + (pull1Disabled ? 'disabled' : '') + ' style="background:' + (pull1Disabled ? 'var(--dl-border)' : 'var(--dl-gold)') + ';color:' + (pull1Disabled ? 'var(--dl-muted)' : '#111827') + ';">' +
                        'Pull x1 · 100 💎' +
                    '</button>' +
                    '<button class="dl-gacha-btn" data-action="pull" data-count="10" ' + (pull10Disabled ? 'disabled' : '') + ' style="background:' + (pull10Disabled ? 'var(--dl-border)' : 'var(--dl-blue)') + ';color:' + (pull10Disabled ? 'var(--dl-muted)' : '#0E1116') + ';">' +
                        'Pull x10 · 900 💎' +
                    '</button>' +
                '</div>' +
            '</div>' +

            '<div class="dl-rarity-legend">' +
                '<span style="color:' + RARITY_COLOR.common + '">common 60%</span>' +
                '<span style="color:' + RARITY_COLOR.rare + '">rare 30%</span>' +
                '<span style="color:' + RARITY_COLOR.epic + '">epic 8%</span>' +
                '<span style="color:' + RARITY_COLOR.legendary + '">legendary 2%</span>' +
            '</div>' +

            pullsHtml
        );
    }

    function statRow(label, value) {
        return '<div class="dl-gameover-stat-row"><span>' + label + '</span><span class="mono">' + value + '</span></div>';
    }

    function renderGameOver() {
        if (!state.gameOver) return '';
        var g = state.gameOver;
        var banishLine = g.name
            ? (g.icon + ' <strong>' + g.name + '</strong> was banished from the party — their page in the ledger is closed.')
            : 'The party was overwhelmed, but no hero remained to banish.';

        return (
            '<div class="dl-overlay">' +
                '<div class="dl-gameover-modal">' +
                    '<div class="dl-gameover-title">💀 THE PARTY HAS FALLEN</div>' +
                    '<div class="dl-gameover-banish">' + banishLine + '</div>' +
                    '<div class="dl-gameover-stats">' +
                        statRow('Deepest Depth', state.deepestRoom) +
                        statRow('Gold Earned', state.goldEarned) +
                        statRow('Heroes Recruited', state.totalRecruited) +
                        statRow('Heroes in Roster', Object.keys(state.owned).length) +
                        statRow('Heroes Lost', state.heroesLost) +
                        statRow('Monsters Defeated', state.monstersDefeated) +
                    '</div>' +
                    '<button class="dl-btn dl-btn-primary" data-action="dismiss-gameover" style="width:100%;">Continue the Ledger</button>' +
                '</div>' +
            '</div>'
        );
    }

    function renderSoftlock() {
        return (
            '<div class="dl-overlay">' +
                '<div class="dl-gameover-modal">' +
                    '<div class="dl-gameover-title" style="color:var(--dl-gold);">📜 THE LEDGER IS EMPTY</div>' +
                    '<div class="dl-gameover-banish">No heroes remain, and there aren’t enough gems left to recruit another. This ledger has reached its end.</div>' +
                    '<div class="dl-gameover-stats">' +
                        statRow('Deepest Depth', state.deepestRoom) +
                        statRow('Gold Earned', state.goldEarned) +
                        statRow('Heroes Recruited', state.totalRecruited) +
                        statRow('Heroes Lost', state.heroesLost) +
                        statRow('Monsters Defeated', state.monstersDefeated) +
                    '</div>' +
                    '<button class="dl-btn dl-btn-primary" data-action="new-game" style="width:100%;">🔄 Start New Game</button>' +
                '</div>' +
            '</div>'
        );
    }

    function render() {
        var app = document.getElementById('app');
        if (!app) return;

        var body = '';
        if (state.tab === 'dungeon') body = renderDungeonTab();
        else if (state.tab === 'heroes') body = renderHeroesTab();
        else if (state.tab === 'items') body = renderItemsTab();
        else if (state.tab === 'gacha') body = renderGachaTab();

        var overlay = '';
        if (state.gameOver) overlay = renderGameOver();
        else if (isSoftlocked()) overlay = renderSoftlock();

        app.innerHTML = renderHeader() + renderTopbar() + renderTabs() + '<div>' + body + '</div>' + overlay;

        var logEl = document.getElementById('dlLog');
        if (logEl) logEl.scrollTop = logEl.scrollHeight;

        ensureTick();
    }

    // ---------- Event delegation ----------

    function onAppClick(e) {
        var btn = e.target.closest ? e.target.closest('[data-action]') : null;
        if (!btn) return;
        var action = btn.getAttribute('data-action');

        if (action === 'tab') {
            state.tab = btn.getAttribute('data-tab');
            render();
        } else if (action === 'toggle-running') {
            state.running = !state.running;
            render();
        } else if (action === 'reset-run') {
            resetRun();
        } else if (action === 'dismiss-gameover') {
            state.gameOver = null;
            render();
        } else if (action === 'new-game') {
            startNewGame();
        } else if (action === 'toggle-team') {
            toggleTeam(btn.getAttribute('data-hero'));
        } else if (action === 'level-up') {
            levelUp(btn.getAttribute('data-hero'));
        } else if (action === 'equip-toggle') {
            var uid = btn.getAttribute('data-uid');
            var heroId = btn.getAttribute('data-hero');
            var item = computeItemsByUid()[uid];
            if (item && item.equippedTo === heroId) unequipItem(uid);
            else equipItem(uid, heroId);
        } else if (action === 'enchant') {
            doEnchant(btn.getAttribute('data-uid'));
        } else if (action === 'sell-request') {
            requestSell(btn.getAttribute('data-uid'));
        } else if (action === 'sell-confirm') {
            confirmSell(btn.getAttribute('data-uid'));
        } else if (action === 'sell-cancel') {
            cancelSell(btn.getAttribute('data-uid'));
        } else if (action === 'pull') {
            doPull(parseInt(btn.getAttribute('data-count'), 10));
        }
    }

    function init() {
        var app = document.getElementById('app');
        if (!app) return;
        app.addEventListener('click', onAppClick);
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

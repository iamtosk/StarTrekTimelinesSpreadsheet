import STTTools from './api';

export function parseRecipeDemands(recipeTree, archetype_id, count) {
    let equipment = STTTools.archetypeCache.find(a => a.id === archetype_id);
    if (!equipment) {
        console.log('Incomplete recipe');
        recipeTree.incomplete = true;
        return;
    }

    if (equipment.recipe && equipment.recipe.demands && (equipment.recipe.demands.length > 0)) {

        let craftCost = 0;
        if (equipment.type === 3) {
            craftCost = STTTools.configCache.config.craft_config.cost_by_rarity_for_component[equipment.rarity].amount;
        } else if (equipment.type === 2) {
            craftCost = STTTools.configCache.config.craft_config.cost_by_rarity_for_equipment[equipment.rarity].amount;
        } else {
            console.error('Equipment of unknown type', equipment);
        }

        recipeTree.craftCost += craftCost * count;

        equipment.recipe.demands.forEach(recipeItem => parseRecipeDemands(recipeTree, recipeItem.archetype_id, recipeItem.count * count));
    } else {
        if (recipeTree.list[equipment.id]) {
            recipeTree.list[equipment.id].count += count;
        } else {
            let factionOnly = equipment.item_sources.every(e => (e.type === 1) || (e.type === 3));
            recipeTree.list[equipment.id] = { equipment, factionOnly, count };
        }
    }
}

export function getMissionCost(id, mastery_level) {
    for (let mission of STTTools.missionsCache) {
        let q = mission.quests.find(q => q.id === id);
        if (q) {
            return q.mastery_levels[mastery_level].energy_cost;
        }
    }

    return undefined;
}

export function estimateChronitonCost(equipment) {
    let sources = equipment.item_sources.filter(e => (e.type === 0) || (e.type === 2));

    // If faction only
    if (sources.length === 0) {
        return 0;
    }

    // TODO: figure out a better way to calculate these
    const RNGESUS = 1.8;

    let costCalc = [];
    sources.forEach(source => {
        let cost = getMissionCost(source.id, source.mastery);

        if (cost) {
            costCalc.push((6 - source.chance_grade) * RNGESUS * cost);
        }
    });

    if (costCalc.length === 0) {
        console.warn('Couldnt calculate cost for equipment', equipment);
        return 0;
    }

    return costCalc.sort()[0];
}
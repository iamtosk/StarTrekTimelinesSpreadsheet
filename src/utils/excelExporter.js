import XlsxPopulate from 'xlsx-populate';

import STTApi from 'sttapi';
import { CONFIG } from 'sttapi';

export async function exportExcel(itemList) {
	let workbook = await XlsxPopulate.fromBlankAsync();
	let worksheet = workbook.addSheet('Crew stats');

	worksheet.column(1).width(5);
	worksheet.column(2).width(28);
	worksheet.column(3).width(14);
	worksheet.column(4).width(8);
	worksheet.column(5).width(12);
	worksheet.column(6).width(7);
	worksheet.column(7).width(8);
	worksheet.column(8).width(24);
	worksheet.column(9).width(8);
	worksheet.column(10).width(8);
	worksheet.column(11).width(24);
	worksheet.column(12).width(8);
	worksheet.column(13).width(8);
	worksheet.column(14).width(24);
	worksheet.column(15).width(8);
	worksheet.column(16).width(8);
	worksheet.column(17).width(24);
	worksheet.column(18).width(8);
	worksheet.column(19).width(8);
	worksheet.column(20).width(24);
	worksheet.column(21).width(8);
	worksheet.column(22).width(8);
	worksheet.column(23).width(24);
	worksheet.column(24).width(8);
	worksheet.column(25).width(8);
	worksheet.column(26).width(10);
	worksheet.column(26).hidden(true);
	worksheet.column(27).width(40);
	worksheet.column(28).width(10);
	worksheet.column(29).width(10);
	worksheet.column(30).width(10);
	worksheet.column(31).width(10);
	worksheet.column(32).width(30);
	worksheet.column(33).width(10);
	worksheet.column(34).width(15);
	worksheet.column(35).width(10);
	worksheet.column(36).width(10);
	worksheet.column(37).width(10);
	worksheet.column(38).width(10);
	worksheet.column(39).width(15);
	worksheet.column(40).width(10);
	worksheet.column(41).width(20);
	worksheet.column(42).width(15);
	worksheet.column(43).width(35);
	worksheet.column(44).width(40);
	worksheet.column(45).width(40);
	worksheet.column(46).width(40);
	worksheet.column(47).width(40);

	worksheet.row(1).style("bold", true);

	//worksheet.autoFilter = 'A1:AA1';

	let values = [];
	values.push(['id', 'name', 'short_name', 'rarity', 'max_rarity', 'level', 'frozen',
'command_skill.core', 'command_skill.min', 'command_skill.max', 'diplomacy_skill.core', 'diplomacy_skill.min', 'diplomacy_skill.max',
'science_skill.core', 'science_skill.min', 'science_skill.max', 'security_skill.core', 'security_skill.min', 'security_skill.max',
'engineering_skill.core', 'engineering_skill.min', 'engineering_skill.max', 'medicine_skill.core', 'medicine_skill.min', 'medicine_skill.max', 'buyback', 'traits',
'ship_battle.accuracy', 'ship_battle.crit_bonus', 'ship_battle.crit_chance', 'ship_battle.evasion', 'action.name', 'action.bonus_amount',
'action.bonus_type', 'action.duration', 'action.cooldown', 'action.initial_cooldown', 'action.limit',
'action.penalty.type', 'action.penalty.amount', 'action.charge_phases',
'action.trigger', 'action.ability', 'equipment.slot 1', 'equipment.slot 2', 'equipment.slot 3', 'equipment.slot 4']);

	STTApi.roster.forEach((crew) => {
		let equipment = [];
		crew.equipment_slots.forEach(es => {
			let arch = STTApi.itemArchetypeCache.archetypes.find(equipment => equipment.id === es.archetype);
			equipment.push((arch ? arch.name : '!UNKNOWN!') + (es.have ? ' (1)' : ' (0)'));
		});

		values.push([crew.id, crew.name, crew.short_name, crew.rarity, crew.max_rarity, crew.level, crew.frozen,
			crew.command_skill.core, crew.command_skill.min, crew.command_skill.max, crew.diplomacy_skill.core, crew.diplomacy_skill.min, crew.diplomacy_skill.max,
			crew.science_skill.core, crew.science_skill.min, crew.science_skill.max, crew.security_skill.core, crew.security_skill.min, crew.security_skill.max,
			crew.engineering_skill.core, crew.engineering_skill.min, crew.engineering_skill.max, crew.medicine_skill.core, crew.medicine_skill.min, crew.medicine_skill.max,
			crew.buyback, crew.traits,
			crew.ship_battle.accuracy, crew.ship_battle.crit_bonus, crew.ship_battle.crit_chance, crew.ship_battle.evasion, crew.action.name, crew.action.bonus_amount,
			CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type], crew.action.duration, crew.action.cooldown, crew.action.initial_cooldown, crew.action.limit,
			crew.action.penalty ? CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.penalty.type] : '',
			crew.action.penalty ? crew.action.penalty.amount : '',
			crew.action.charge_phases ? JSON.stringify(crew.action.charge_phases) : '',
			crew.action.ability ? CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition] : '',
			crew.action.ability ? CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', crew.action.ability.amount) : '',
			equipment[0], equipment[1], equipment[2], equipment[3]
		]);
	});

	worksheet.cell("A1").value(values);

	let worksheetItems = workbook.addSheet('Item stats');

	worksheetItems.column(1).width(5);
	worksheetItems.column(2).width(42);
	worksheetItems.column(3).width(10);
	worksheetItems.column(4).width(10);
	worksheetItems.column(5).width(14);
	worksheetItems.column(6).width(58);
	worksheetItems.column(7).width(70);

	values = [];
	values.push(['id', 'name', 'quantity', 'rarity', 'type', 'symbol', 'details']);

	worksheetItems.row(1).style("bold", true);

	//worksheetItems.autoFilter = 'A1:G1';

	itemList.forEach((item) => {
		values.push([item.archetype_id, item.name, item.quantity, item.rarity,
			item.icon.file.replace("/items", "").split("/")[1], item.icon.file.replace("/items", "").split("/")[2], item.flavor]);
	});

	worksheetItems.cell("A1").value(values);

	let worksheetShips = workbook.addSheet('Ship stats');

	worksheetShips.column(1).width(5);
	worksheetShips.column(2).width(30);
	worksheetShips.column(3).width(12);
	worksheetShips.column(4).width(12);
	worksheetShips.column(5).width(8);
	worksheetShips.column(6).width(10);
	worksheetShips.column(7).width(10);
	worksheetShips.column(8).width(10);
	worksheetShips.column(9).width(10);
	worksheetShips.column(10).width(10);
	worksheetShips.column(11).width(10);
	worksheetShips.column(12).width(30);

	values = [];
	values.push(['id', 'name', 'level', 'max_level', 'rarity', 'shields', 'hull', 'attack', 'accuracy', 'evasion', 'schematics', 'traits']);

	worksheetShips.row(1).style("bold", true);

	//worksheetShips.autoFilter = 'A1:J1';

	const playerSchematics = STTApi.playerData.character.items.filter(item => item.type === 8);
	const numberOfSchematics = (archetype_id) => {
		const schematic = STTApi.shipSchematics.find(schematic => schematic.ship.archetype_id === archetype_id);
		if (!schematic) {
			return 0;
		}
		const playerSchematic = playerSchematics.find(playerSchematic => playerSchematic.archetype_id === schematic.id);
		return playerSchematic ? playerSchematic.quantity : 0;
	}

	STTApi.ships.forEach((ship) => {
		values.push([ship.archetype_id, ship.name, (ship.level === 0) ? 'N/A' : (ship.level + 1), ship.max_level + 1, ship.rarity, ship.shields, ship.hull, ship.attack, ship.accuracy, ship.evasion, numberOfSchematics(ship.archetype_id), ship.traitNames]);
	});

	worksheetShips.cell("A1").value(values);

	workbook.deleteSheet(0);

	return workbook.outputAsync();
}
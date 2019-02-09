import STTApi from 'sttapi';

import { simplejson2csv } from './simplejson2csv';

export function exportCsv() {
	let fields = [{
			label: 'Id',
			value: (row) => row.id
		},
		{
			label: 'Name',
			value: (row) => row.name
		},
		{
			label: 'Short name',
			value: (row) => row.short_name
		},
		{
			label: 'Max rarity',
			value: (row) => row.max_rarity
		},
		{
			label: 'Rarity',
			value: (row) => row.rarity
		},
		{
			label: 'Level',
			value: (row) => row.level
		},
		{
			label: 'Frozen',
			value: (row) => row.frozen
		},
		{
			label: 'Buyback',
			value: (row) => row.buyback
		},
		{
			label: 'Command core',
			value: (row) => row.command_skill.core
		},
		{
			label: 'Command min',
			value: (row) => row.command_skill.min
		},
		{
			label: 'Command max',
			value: (row) => row.command_skill.max
		},
		{
			label: 'Diplomacy core',
			value: (row) => row.diplomacy_skill.core
		},
		{
			label: 'Diplomacy min',
			value: (row) => row.diplomacy_skill.min
		},
		{
			label: 'Diplomacy max',
			value: (row) => row.diplomacy_skill.max
		},
		{
			label: 'Engineering core',
			value: (row) => row.engineering_skill.core
		},
		{
			label: 'Engineering min',
			value: (row) => row.engineering_skill.min
		},
		{
			label: 'Engineering max',
			value: (row) => row.engineering_skill.max
		},
		{
			label: 'Medicine core',
			value: (row) => row.medicine_skill.core
		},
		{
			label: 'Medicine min',
			value: (row) => row.medicine_skill.min
		},
		{
			label: 'Medicine max',
			value: (row) => row.medicine_skill.max
		},
		{
			label: 'Science core',
			value: (row) => row.science_skill.core
		},
		{
			label: 'Science min',
			value: (row) => row.science_skill.min
		},
		{
			label: 'Science max',
			value: (row) => row.science_skill.max
		},
		{
			label: 'Security core',
			value: (row) => row.security_skill.core
		},
		{
			label: 'Security min',
			value: (row) => row.security_skill.min
		},
		{
			label: 'Security max',
			value: (row) => row.security_skill.max
		},
		{
			label: 'Traits',
			value: (row) => row.traits
		},
		{
			label: 'Ship battle accuracy',
			value: (row) => row.ship_battle.accuracy || ''
		},
		{
			label: 'Ship battle crit bonus',
			value: (row) => row.ship_battle.crit_bonus || ''
		},
		{
			label: 'Ship battle crit chance',
			value: (row) => row.ship_battle.crit_chance || ''
		},
		{
			label: 'Ship battle evasion',
			value: (row) => row.ship_battle.evasion || ''
		},
		{
			label: 'Action name',
			value: (row) => row.action.name
		},
		{
			label: 'Action bonus amount',
			value: (row) => row.action.bonus_amount
		},
		{
			label: 'Action bonus type',
			value: (row) => row.action.bonus_type
		},
		{
			label: 'Action duration',
			value: (row) => row.action.duration
		},
		{
			label: 'Action cooldown',
			value: (row) => row.action.cooldown
		},
		{
			label: 'Action initial cooldown',
			value: (row) => row.action.initial_cooldown
		},
		{
			label: 'Action limit',
			value: (row) => row.action.limit || ''
		},
		{
			label: 'Action penalty type',
			value: (row) => row.action.penalty ? row.action.penalty.type : ''
		},
		{
			label: 'Action penalty amount',
			value: (row) => row.action.penalty ? row.action.penalty.amount : ''
		},
		{
			label: 'Action charge phases',
			value: (row) => row.action.charge_phases ? JSON.stringify(row.action.charge_phases) : ''
		},
		{
			label: 'Action ability condition',
			value: (row) => row.action.ability ? row.action.ability.condition : ''
		},
		{
			label: 'Action ability type',
			value: (row) => row.action.ability ? row.action.ability.type : ''
		},
		{
			label: 'Action ability amount',
			value: (row) => row.action.ability ? row.action.ability.amount : ''
		}];

	return simplejson2csv(STTApi.roster, fields);
}

export function exportItemsCsv() {
	let fields = [{
			label: 'Name',
			value: (row) => row.name
		},
		{
			label: 'Rarity',
			value: (row) => row.rarity
		},
		{
			label: 'Quantity',
			value: (row) => row.quantity
		},
		{
			label: 'Type',
			value: (row) => row.typeName
		},
		{
			label: 'Symbol',
			value: (row) => row.symbol
		},
		{
			label: 'Flavor',
			value: (row) => row.flavor
		}];

	return simplejson2csv(STTApi.playerData.character.items, fields);
}

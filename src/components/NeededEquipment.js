import React from 'react';
import { getTheme } from '@uifabric/styling';

import { Input, Dropdown, Grid } from 'semantic-ui-react';

import { ItemDisplay } from './ItemDisplay';
import { CollapsibleSection } from './CollapsibleSection.js';

import STTApi from 'sttapi';
import { CONFIG } from 'sttapi';

import { download } from '../utils/pal';

import { simplejson2csv } from '../utils/simplejson2csv';

export class NeededEquipment extends React.Component {
	constructor(props) {
		super(props);

		let peopleList = [];
		STTApi.allcrew.forEach(crew => {
			let have = STTApi.roster.find(c => c.symbol === crew.symbol);

			peopleList.push({
				key: crew.id,
				value: crew.id,
				image: { src: crew.iconUrl },
				text: `${crew.name} (${have ? 'owned' : 'unowned'} ${crew.max_rarity}*)`
			});
		});

		this.state = {
			neededEquipment: [],
			peopleList: peopleList,
			currentSelectedItems: [],
			filters: {
				onlyNeeded: true,
				onlyFaction: false,
				cadetable: false,
				allLevels: false,
				userText: undefined
			}
		};

	}

	_getMissionCost(id, mastery_level) {
		for (let mission of STTApi.missions) {
			let q = mission.quests.find(q => q.id === id);
			if (q) {
				if (q.locked || (q.mastery_levels[mastery_level].progress.goal_progress !== q.mastery_levels[mastery_level].progress.goals)) {
					return undefined;
				}

				return q.mastery_levels[mastery_level].energy_cost;
			}
		}

		return undefined;
	}

	_filterNeededEquipment(filters) {
		const neededEquipment = STTApi.getNeededEquipment(filters, this.state.currentSelectedItems);

		return this.setState({
			neededEquipment: neededEquipment
		});
	}

	_toggleFilter(name) {
		const newFilters = Object.assign({}, this.state.filters);
		newFilters[name] = !newFilters[name];
		this.setState({
			filters: newFilters
		}, () => { this._updateCommandItems(); });

		return this._filterNeededEquipment(newFilters);
	}

	_filterText(filterString) {
		const newFilters = Object.assign({}, this.state.filters);
		newFilters.userText = filterString;
		this.setState({
			filters: newFilters
		});

		return this._filterNeededEquipment(newFilters);
	}

	renderSources(entry) {
		let equipment = entry.equipment;
		let counts = entry.counts;
		let disputeMissions = equipment.item_sources.filter(e => e.type === 0);
		let shipBattles = equipment.item_sources.filter(e => e.type === 2);
		let factions = equipment.item_sources.filter(e => e.type === 1);
		let cadetSources = entry.cadetSources;
		let factionSources = entry.factionSources;

		let res = [];

		res.push(<div key={'crew'}>
			<b>Crew: </b>
			{Array.from(counts.values()).sort((a, b) => b.count - a.count).map((entry, idx) =>
				<span key={idx}>{entry.crew.name} (x{entry.count})</span>
			).reduce((prev, curr) => [prev, ', ', curr])}
		</div>)

		if (disputeMissions.length > 0) {
			res.push(<div key={'disputeMissions'} style={{ lineHeight: '2.5' }}>
				<b>Missions: </b>
				{disputeMissions.map((entry, idx) =>
					<div className={"ui labeled button disabled compact tiny" + ((this._getMissionCost(entry.id, entry.mastery) === undefined) ? " disabled" : "")} key={idx}>
						<div className="ui button compact tiny">
							{entry.name} <span style={{ display: 'inline-block' }}><img src={CONFIG.MASTERY_LEVELS[entry.mastery].url()} height={14} /></span> ({entry.chance_grade}/5)
						</div>
						<a className="ui blue label">
							{this._getMissionCost(entry.id, entry.mastery)} <span style={{ display: 'inline-block' }}><img src={CONFIG.SPRITES['energy_icon'].url} height={14} /></span>
						</a>
					</div>
				).reduce((prev, curr) => [prev, ' ', curr])}
			</div>)
		}

		if (shipBattles.length > 0) {
			res.push(<div key={'shipBattles'} style={{ lineHeight: '2.5' }}>
				<b>Ship battles: </b>
				{shipBattles.map((entry, idx) =>
					<div className={"ui labeled button disabled compact tiny" + ((this._getMissionCost(entry.id, entry.mastery) === undefined) ? " disabled" : "")} key={idx}>
						<div className="ui button compact tiny">
							{entry.name} <span style={{ display: 'inline-block' }}><img src={CONFIG.MASTERY_LEVELS[entry.mastery].url()} height={14} /></span> ({entry.chance_grade}/5)
						</div>
						<a className="ui blue label">
							{this._getMissionCost(entry.id, entry.mastery)} <span style={{ display: 'inline-block' }}><img src={CONFIG.SPRITES['energy_icon'].url} height={14} /></span>
						</a>
					</div>
				).reduce((prev, curr) => [prev, ' ', curr])}
			</div>)
		}

		if (cadetSources.length > 0) {
			res.push(<div key={'cadet'}>
				<b>Cadet missions: </b>
				{cadetSources.map((entry, idx) =>
					<span key={idx}>{`${entry.quest.name} (${entry.mission.episode_title})`} <span style={{ display: 'inline-block' }}><img src={CONFIG.MASTERY_LEVELS[entry.masteryLevel].url()} height={16} /></span></span>
				).reduce((prev, curr) => [prev, ', ', curr])}
			</div>)
		}

		if (factions.length > 0) {
			res.push(<div key={'factions'}>
				<b>Faction missions: </b>
				{factions.map((entry, idx) =>
					`${entry.name} (${entry.chance_grade}/5)`
				).join(', ')}
			</div>)
		}

		if (factionSources.length > 0) {
			res.push(<div key={'factionstores'}>
				<b>Faction shops: </b>
				{factionSources.map((entry, idx) =>
					`${entry.cost_amount} ${CONFIG.CURRENCIES[entry.cost_currency].name} in the ${entry.faction.name} shop`
				).join(', ')}
			</div>)
		}

		return <div>{res}</div>;
	}

	_selectFavorites() {
		let dupeChecker = new Set(this.state.currentSelectedItems);
		STTApi.roster.filter(c => c.favorite).forEach(crew => {
            if (!dupeChecker.has(crew.id)) {
                dupeChecker.add(crew.id);
            }
		});
		
		this.setState({ currentSelectedItems: Array.from(dupeChecker.values()) });
	}

	componentDidMount() {
		this._updateCommandItems();
		this._filterNeededEquipment(this.state.filters);
	}

	_updateCommandItems() {
		if (this.props.onCommandItemsUpdate) {
			this.props.onCommandItemsUpdate([
				{
					key: 'settings',
					text: 'Settings',
					iconProps: { iconName: 'Equalizer' },
					subMenuProps: {
						items: [{
							key: 'onlyFavorite',
							text: 'Show only for favorite crew',
							onClick: () => { this._selectFavorites(); }
						},
						{
							key: 'onlyNeeded',
							text: 'Show only insufficient equipment',
							canCheck: true,
							isChecked: this.state.filters.onlyNeeded,
							onClick: () => { this._toggleFilter('onlyNeeded'); }
						},
						{
							key: 'onlyFaction',
							text: 'Show items obtainable through faction missions only',
							canCheck: true,
							isChecked: this.state.filters.onlyFaction,
							onClick: () => { this._toggleFilter('onlyFaction'); }
						},
						{
							key: 'cadetable',
							text: 'Show items obtainable through cadet missions only',
							canCheck: true,
							isChecked: this.state.filters.cadetable,
							onClick: () => { this._toggleFilter('cadetable'); }
						},
						{
							key: 'allLevels',
							text: '(EXPERIMENTAL) show needs for all remaining level bands to FE',
							canCheck: true,
							isChecked: this.state.filters.allLevels,
							onClick: () => { this._toggleFilter('allLevels'); }
						}]
					}
				},
				{
					key: 'exportCsv',
					name: 'Export CSV...',
					iconProps: { iconName: 'ExcelDocument' },
					onClick: () => { this._exportCSV(); }
				}
			]);
		}
	}

	renderFarmList() {
		if (!this.state.neededEquipment) {
			return <span />;
		}

		let missionMap = new Map();
		this.state.neededEquipment.forEach(entry => {
			let equipment = entry.equipment;
			let missions = equipment.item_sources.filter(e => (e.type === 0) || (e.type === 2));

			missions.forEach(mission => {
				if (!this._getMissionCost(mission.id, mission.mastery)) {
					// Disabled missions are filtered out
					return;
				}

				let key = mission.id * (mission.mastery + 1);
				if (!missionMap.has(key)) {
					missionMap.set(key, {
						mission: mission,
						equipment: []
					});
				}

				missionMap.get(key).equipment.push(equipment);
			});
		});

		let entries = Array.from(missionMap.values());
		entries.sort((a, b) => a.equipment.length - b.equipment.length);

		// Minimize entries
		const obtainable = (equipment, entry) => entries.some(e => (e !== entry) && e.equipment.some(eq => eq.id === equipment.id));

		// TODO: there must be a better algorithm for this, maybe one that also accounts for drop chances to break ties :)
		let reducePossible = true;
		while (reducePossible) {
			reducePossible = false;

			for (let entry of entries) {
				if (entry.equipment.every(eq => obtainable(eq, entry))) {
					entries.splice(entries.indexOf(entry), 1);
					reducePossible = true;
				}
			}
		}

		entries.reverse();

		let res = [];
		for (let val of entries) {
			let key = val.mission.id * (val.mission.mastery + 1);
			let entry = val.mission;

			res.push(<div key={key} style={{ lineHeight: '2.5' }}>
				<div className="ui labeled button disabled compact tiny" key={key}>
					<div className="ui button compact tiny">
						{entry.name} <span style={{ display: 'inline-block' }}><img src={CONFIG.MASTERY_LEVELS[entry.mastery].url()} height={14} /></span> ({entry.chance_grade}/5)
					</div>
					<a className="ui blue label">
						{this._getMissionCost(entry.id, entry.mastery)} <span style={{ display: 'inline-block' }}><img src={CONFIG.SPRITES['energy_icon'].url} height={14} /></span>
					</a>
				</div>

				<div className="ui label small">
					{val.equipment.map((entry, idx) => <span key={idx} style={{ color: entry.rarity && CONFIG.RARITIES[entry.rarity].color }}>{(entry.rarity ? CONFIG.RARITIES[entry.rarity].name : '')} {entry.name}</span>).reduce((prev, curr) => [prev, ', ', curr])}
				</div>
			</div>);
		}

		return <CollapsibleSection title='Farming list (WORK IN PROGRESS, NEEDS A LOT OF IMPROVEMENT)'>
			<p>This list minimizes the number of missions that can yield all filtered equipment as rewards (it <b>doesn't</b> factor in drop chances).</p>
			{res}
		</CollapsibleSection>;
	}

	render() {
		if (this.state.neededEquipment) {
			return (<div className='tab-panel-x' data-is-scrollable='true'>
				<p>Equipment required to fill all open slots for all crew currently in your roster{!this.state.filters.allLevels && <span>, for their current level band</span>}</p>
				<small>Note that partially complete recipes result in zero counts for some crew and items</small>

				{this.state.filters.allLevels && <div>
					<br />
					<p><span style={{ color: 'red', fontWeight: 'bold' }}>WARNING!</span> Equipment information for all levels is crowdsourced. It is most likely incomplete and potentially incorrect (especially if DB changed the recipe tree since the data was cached). This equipment may also not display an icon and may show erroneous source information! Use this data only as rough estimates.</p>
					<br />
				</div>}

				<Grid>
					<Grid.Column width={6}>
						<Input fluid icon='search' placeholder='Filter...' value={this.state.filters.userText} onChange={(e, {value}) => this._filterText(value)} />
					</Grid.Column>
					<Grid.Column width={10}>
						<Dropdown clearable fluid multiple search selection options={this.state.peopleList}
							placeholder='Select or search crew'
							label='Show only for these crew'
							value={this.state.currentSelectedItems}
							onChange={(e, { value }) => this.setState({ currentSelectedItems: value }, () => this._filterText(this.state.filters.userText))}
						/>
					</Grid.Column>
				</Grid>

				{this.state.neededEquipment.map((entry, idx) =>
					<div key={idx} className="ui raised segment" style={{ display: 'grid', gridTemplateColumns: '128px auto', gridTemplateAreas: `'icon name' 'icon details'`, padding: '8px 4px', margin: '8px', backgroundColor: getTheme().palette.themeLighter }}>
						<div style={{ gridArea: 'icon', textAlign: 'center' }}>
							<ItemDisplay src={entry.equipment.iconUrl} size={128} maxRarity={entry.equipment.rarity} rarity={entry.equipment.rarity} />
						</div>
						<div style={{ gridArea: 'name', alignSelf: 'start', margin: '0' }}>
							<h4><a href={'https://stt.wiki/wiki/' + entry.equipment.name.split(' ').join('_')} target='_blank'>{entry.equipment.name}</a>
							{` (need ${entry.needed}, have ${entry.have})`}</h4>
						</div>
						<div style={{ gridArea: 'details', alignSelf: 'start' }}>
							{this.renderSources(entry)}
						</div>
					</div>
				)}
				{this.renderFarmList()}
			</div>);
		}
		else {
			return <span />;
		}
	}

	_exportCSV() {
		let fields = [{
				label: 'Equipment name',
				value: (row) => row.equipment.name
			},
			{
				label: 'Equipment rarity',
				value: (row) => row.equipment.rarity
			},
			{
				label: 'Needed',
				value: (row) => row.needed
			},
			{
				label: 'Have',
				value: (row) => row.have
			},
			{
				label: 'Missions',
				value: (row) => row.equipment.item_sources.filter(e => e.type === 0).map((mission) => `${mission.name} (${CONFIG.MASTERY_LEVELS[mission.mastery].name} ${mission.chance_grade}/5, ${(mission.energy_quotient * 100).toFixed(2)}%)`).join(', ')
			},
			{
				label: 'Ship battles',
				value: (row) => row.equipment.item_sources.filter(e => e.type === 2).map((mission) => `${mission.name} (${CONFIG.MASTERY_LEVELS[mission.mastery].name} ${mission.chance_grade}/5, ${(mission.energy_quotient * 100).toFixed(2)}%)`).join(', ')
			},
			{
				label: 'Faction missions',
				value: (row) => row.equipment.item_sources.filter(e => e.type === 1).map((mission) => `${mission.name} (${mission.chance_grade}/5, ${(mission.energy_quotient * 100).toFixed(2)}%)`).join(', ')
			},
			{
				label: 'Cadet misions',
				value: (row) => row.cadetSources.map((mission) => `${mission.quest.name} from ${mission.mission.episode_title} (${CONFIG.MASTERY_LEVELS[mission.masteryLevel].name})`).join(', ')
			}
		];
		let csv = simplejson2csv(this.state.neededEquipment, fields);

		let today = new Date();
		download('Equipment-' + (today.getUTCMonth() + 1) + '-' + (today.getUTCDate()) + '.csv', csv, 'Export needed equipment', 'Export');
	}
}
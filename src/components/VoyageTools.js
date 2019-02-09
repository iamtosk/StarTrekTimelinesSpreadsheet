import React from 'react';

import { Message, Dropdown, Button, Header, Select, Checkbox, Form, List, Image, Icon, Card } from 'semantic-ui-react';

import STTApi from 'sttapi';
import {
	CONFIG,
	bestVoyageShip,
	loadVoyage,
	formatCrewStats,
	bonusCrewForCurrentEvent,
	formatTimeSeconds
} from 'sttapi';
import { CollapsibleSection } from './CollapsibleSection';
import { RarityStars } from './RarityStars';
import ReactTable from 'react-table';

import { download } from '../utils/pal';
import { calculateVoyage, estimateVoyageRemaining, exportVoyageData } from '../utils/voyageCalc';

export class VoyageCrew extends React.Component {
	constructor(props) {
		super(props);

		let bestVoyageShips = bestVoyageShip();
		this.state = {
			bestShips: bestVoyageShips,
			selectedShip: bestVoyageShips[0].ship.id,
			includeFrozen: false,
			includeActive: false,
			shipName: undefined,
			state: undefined,
			searchDepth: 6,
			extendsTarget: 0,
			activeEvent: undefined,
			peopleList: [],
			currentSelectedItems: [],
			error: undefined,
			generatingVoyCrewRank: false
		};

		// See which crew is needed in the event to give the user a chance to remove them from consideration
		let result = bonusCrewForCurrentEvent();
		if (result) {
			this.state.activeEvent = result.eventName;
			this.state.currentSelectedItems = result.crewIds;
		}

		STTApi.roster.forEach(crew => {
			this.state.peopleList.push({
				key: crew.crew_id || crew.id,
				value: crew.crew_id || crew.id,
				image: { avatar: true, src: crew.iconUrl },
				text: crew.name
			});
		});

		this._calcVoyageData = this._calcVoyageData.bind(this);
	}

	getIndexBySlotName(slotName) {
		const crewSlots = STTApi.playerData.character.voyage_descriptions[0].crew_slots;
		for (let slotIndex = 0; slotIndex < crewSlots.length; slotIndex++) {
			if (crewSlots[slotIndex].name === slotName) {
				return slotIndex;
			}
		}
	}

	renderBestCrew() {
		if (this.state.state === 'inprogress' || this.state.state === 'done') {
			let crewSpans = [];
			this.state.crewSelection.forEach(entry => {
				if (entry.choice) {
					let status = entry.choice.frozen > 0 ? 'frozen' : entry.choice.active_id > 0 ? 'active' : 'available';
					let statusColor = status === 'frozen' ? 'red' : status === 'active' ? 'yellow' : 'green';
					let crew = (
						<Card key={entry.choice.crew_id || entry.choice.id} color={statusColor}>
							<Card.Content>
								<Image floated='right' size='mini' src={entry.choice.iconUrl} />
								<Card.Header>{entry.choice.name}</Card.Header>
								<Card.Meta>{STTApi.playerData.character.voyage_descriptions[0].crew_slots[entry.slotId].name}</Card.Meta>
								<Card.Description>{formatCrewStats(entry.choice)}</Card.Description>
							</Card.Content>
							<Card.Content extra>Status: {status}</Card.Content>
						</Card>
					);

					crewSpans[entry.slotId] = crew;
				} else {
					console.error(entry);
				}
			});

			return (
				<div>
					<br />
					{this.state.state === 'inprogress' && <div className='ui medium centered text active inline loader'>Still calculating...</div>}
					<Card.Group>{crewSpans}</Card.Group>
				</div>
			);
		} else {
			return <span />;
		}
	}

	render() {
		let shipSpans = [];
		for (let entry of this.state.bestShips) {
			shipSpans.push({
				key: entry.ship.id,
				text: entry.ship.name,
				value: entry.ship.id,
				content: (
					<Header
						icon={<img src={entry.ship.iconUrl} height={48} style={{ display: 'inline-block' }} />}
						content={entry.ship.name}
						subheader={`${entry.score.toFixed(0)} antimatter`}
					/>
				)
			});
		}

		let curVoy = '';
		if (STTApi.playerData.character.voyage_descriptions && STTApi.playerData.character.voyage_descriptions.length > 0) {
			curVoy = `${CONFIG.SKILLS[STTApi.playerData.character.voyage_descriptions[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[STTApi.playerData.character.voyage_descriptions[0].skills.secondary_skill]
			} secondary`;
		}
		if (STTApi.playerData.character.voyage && STTApi.playerData.character.voyage.length > 0) {
			curVoy = `${CONFIG.SKILLS[STTApi.playerData.character.voyage[0].skills.primary_skill]} primary / ${
				CONFIG.SKILLS[STTApi.playerData.character.voyage[0].skills.secondary_skill]
			} secondary`;
		}

		return (
			<div style={{ margin: '5px' }}>
				<Message attached>
					Configure the settings below, then click on the "Calculate" button to see the recommendations. Current voyage is <b>{curVoy}</b>.
				</Message>
				<Form className='attached fluid segment' loading={this.state.generatingVoyCrewRank || this.state.state === 'inprogress'}>
					<Form.Group inline>
						<Form.Field
							control={Select}
							label='Search depth'
							options={[
								{ key: '4', text: '4 (fastest)', value: 4 },
								{ key: '5', text: '5 (faster)', value: 5 },
								{ key: '6', text: '6 (normal)', value: 6 },
								{ key: '7', text: '7 (slower)', value: 7 },
								{ key: '8', text: '8 (slowest)', value: 8 },
								{ key: '9', text: '9 (for supercomputers)', value: 9 }
							]}
							value={this.state.searchDepth}
							onChange={(e, { value }) => this.setState({ searchDepth: value })}
							placeholder='Search depth'
						/>
						<Form.Field
							control={Select}
							label='Extends (target)'
							options={[
								{ key: '0', text: 'none (default)', value: 0 },
								{ key: '1', text: 'one', value: 1 },
								{ key: '2', text: 'two', value: 2 }
							]}
							value={this.state.extendsTarget}
							onChange={(e, { value }) => this.setState({ extendsTarget: value })}
							placeholder='How many times you plan to revive'
						/>
					</Form.Group>

					<Form.Group inline>
						<Form.Field>
							<label>Choose a ship</label>
							<Dropdown
								className='ship-dropdown'
								selection
								options={shipSpans}
								placeholder='Choose a ship for your voyage'
								value={this.state.selectedShip}
								onChange={(ev, { value }) => this.setState({ selectedShip: value })}
							/>
						</Form.Field>

						<Form.Input
							label='Ship name'
							value={this.state.shipName}
							placeholder={this.state.bestShips.find(s => s.ship.id == this.state.selectedShip).ship.name}
							onChange={(ev, { value }) => this.setState({ shipName: value })}
						/>
					</Form.Group>

					<Form.Group>
						<Form.Field
							control={Dropdown}
							clearable
							fluid
							multiple
							search
							selection
							options={this.state.peopleList}
							placeholder='Select or search for crew'
							label={
								"Crew you don't want to consider for voyage" +
								(this.state.activeEvent ? ` (preselected crew which gives bonus in the event ${this.state.activeEvent})` : '')
							}
							value={this.state.currentSelectedItems}
							onChange={(e, { value }) => this.setState({ currentSelectedItems: value })}
						/>
					</Form.Group>

					<Form.Group inline>
						<Form.Field
							control={Checkbox}
							label='Include active (on shuttles) crew'
							checked={this.state.includeActive}
							onChange={(e, { checked }) => this.setState({ includeActive: checked })}
						/>

						<Form.Field
							control={Checkbox}
							label='Include frozen (vaulted) crew'
							checked={this.state.includeFrozen}
							onChange={(e, { checked }) => this.setState({ includeFrozen: checked })}
						/>
					</Form.Group>

					{(this.state.state === 'inprogress' || this.state.state === 'done') && (
						<h3>
							Estimated duration: <b>{formatTimeSeconds(this.state.estimatedDuration * 60 * 60)}</b>
						</h3>
					)}

					<Form.Group>
						<Form.Button primary onClick={this._calcVoyageData} disabled={this.state.state === 'inprogress'}>
							Calculate best crew selection
						</Form.Button>
						{/* #!if ENV === 'electron' */}
						<Form.Button onClick={() => this._generateVoyCrewRank()} disabled={this.state.state === 'inprogress'}>
							Export CSV with crew Voyage ranking...
						</Form.Button>
						{/* #!endif */}
					</Form.Group>
				</Form>
				<Message attached='bottom' error hidden={!this.state.error}>
					Error: {this.state.error}
				</Message>

				{this.renderBestCrew()}
			</div>
		);
	}

	_packVoyageOptions() {
		let filteredRoster = STTApi.roster.filter(crew => {
			// Filter out buy-back crew
			if (crew.buyback) {
				return false;
			}

			if (!this.state.includeActive && crew.active_id > 0) {
				return false;
			}

			if (!this.state.includeFrozen && crew.frozen > 0) {
				return false;
			}

			// TODO: ignore crew crashes
			// TODO: fix wasm

			// Filter out crew the user has chosen not to include
			if (
				this.state.currentSelectedItems.length > 0 &&
				this.state.currentSelectedItems.some(ignored => ignored === (crew.crew_id || crew.id))
			) {
				return false;
			}

			return true;
		});

		return {
			searchDepth: this.state.searchDepth,
			extendsTarget: this.state.extendsTarget,
			shipAM: this.state.bestShips.find(s => s.ship.id == this.state.selectedShip).score,
			skillPrimaryMultiplier: 3.5,
			skillSecondaryMultiplier: 2.5,
			skillMatchingMultiplier: 1.1,
			traitScoreBoost: 200,
			voyage_description: STTApi.playerData.character.voyage_descriptions[0],
			roster: filteredRoster
		};
	}

	_calcVoyageData() {
		let options = this._packVoyageOptions();

		calculateVoyage(
			options,
			(entries, score) => {
				this.setState({
					crewSelection: entries,
					estimatedDuration: score,
					state: 'inprogress'
				});
			},
			(entries, score) => {
				this.setState({
					crewSelection: entries,
					estimatedDuration: score,
					state: 'done'
				});
			}
		);
	}

	// #!if ENV === 'electron'
	_generateVoyCrewRank() {
		this.setState({ generatingVoyCrewRank: true });

		let dataToExport = exportVoyageData(this._packVoyageOptions());

		const NativeExtension = require('electron').remote.require('stt-native');
		NativeExtension.calculateVoyageCrewRank(
			JSON.stringify(dataToExport),
			(rankResult, estimateResult) => {
				this.setState({ generatingVoyCrewRank: false });

				download('My Voyage Crew.csv', rankResult, 'Export Star Trek Timelines voyage crew ranking', 'Export');
				download('My Voyage Estimates.csv', estimateResult, 'Export Star Trek Timelines voyage estimates', 'Export');
			},
			progressResult => {
				console.log('unexpected progress result!'); // not implemented yet..
			}
		);
	}
	// #!endif
}

export class VoyageLogEntry extends React.Component {
	constructor(props) {
		super(props);

		this.props.log.forEach(entry => {
			// TODO: some log entries have 2 crew
			if (entry.crew) {
				let rc = STTApi.roster.find(rosterCrew => rosterCrew.symbol == entry.crew[0]);
				if (rc) entry.crewIconUrl = rc.iconUrl;
			}
		});
	}

	render() {
		let listItems = [];
		this.props.log.forEach((entry, index) => {
			if (entry.crewIconUrl) {
				listItems.push(
					<List.Item key={index}>
						<Image avatar src={entry.crewIconUrl} />
						<List.Content>
							<List.Header>
								<span dangerouslySetInnerHTML={{ __html: entry.text }} />
							</List.Header>
							{entry.skill_check && (
								<List.Description>
									<span className='quest-mastery'>
										<img src={CONFIG.SPRITES['icon_' + entry.skill_check.skill].url} height={18} />
										{entry.skill_check.passed == true ? <Icon name='thumbs up' /> : <Icon name='thumbs down' />}
									</span>
								</List.Description>
							)}
						</List.Content>
					</List.Item>
				);
			} else {
				listItems.push(
					<List.Item key={index}>
						<span dangerouslySetInnerHTML={{ __html: entry.text }} />
					</List.Item>
				);
			}
		});

		return <List>{listItems}</List>;
	}
}

export class VoyageLog extends React.Component {
	constructor(props) {
		super(props);

		let _columns = [
			{
				id: 'icon',
				Header: '',
				minWidth: 30,
				maxWidth: 30,
				resizable: false,
				accessor: row => row.full_name,
				Cell: p => <img src={p.original.iconUrl} height={25} />
			},
			{
				id: 'quantity',
				Header: 'Quantity',
				minWidth: 50,
				maxWidth: 70,
				resizable: false,
				accessor: row => row.quantity
			},
			{
				id: 'name',
				Header: 'Name',
				minWidth: 150,
				maxWidth: 250,
				resizable: true,
				accessor: row => row.full_name,
				Cell: p => {
					let item = p.original;
					return (
						<a href={'https://stt.wiki/wiki/' + item.full_name.split(' ').join('_')} target='_blank'>
							{item.full_name}
						</a>
					);
				}
			},
			{
				id: 'rarity',
				Header: 'Rarity',
				accessor: c => {
					if (c.type > 2) {
						return -1;
					}
					return c.rarity;
				},
				minWidth: 75,
				maxWidth: 75,
				resizable: false,
				Cell: p => {
					let item = p.original;
					// 3 is for honor, credits, crons
					if (item.type > 2) {
						return <span />;
					}

					return (
						<span key={item.id} style={{ color: item.rarity && CONFIG.RARITIES[item.rarity].color }}>
							<RarityStars min={1} max={item.rarity ? item.rarity : 1} value={item.rarity ? item.rarity : null} />
						</span>
					);
				}
			},
			{
				id: 'type',
				Header: 'Type',
				minWidth: 100,
				resizable: true,
				accessor: row => {
					if (row.item_type) {
						return row.type + '.' + row.item_type;
					}
					return row.type;
				},
				Cell: p => {
					let item = p.original;

					if (item.type === 1) {
						// For crew, check if it's useful or not
						let have = STTApi.roster.filter(crew => crew.symbol === item.symbol);
						if (have.length > 0) {
							if (have.some(c => c.frozen === 1)) {
								return <span>Duplicate of frozen crew (airlock-able)</span>;
							}
							if (have.some(c => c.max_rarity === c.rarity)) {
								return <span>Duplicate of fully-fused crew (airlock-able)</span>;
							}

							return <span style={{ fontWeight: 'bold' }}>NEW STAR FOR CREW!</span>;
						}
						return <span style={{ fontWeight: 'bold' }}>NEW CREW!</span>;
					}

					let typeName = CONFIG.REWARDS_ITEM_TYPE[item.item_type];
					if (typeName) {
						return typeName;
					}
					typeName = CONFIG.REWARDS_TYPE[item.type];
					if (typeName) {
						return typeName;
					}

					// fall-through case for items
					typeName = item.icon.file.replace('/items', '').split('/')[1];
					if (typeName) {
						return typeName;
					}

					// show something so we know to fix these
					if (item.item_type) {
						return item.type + '.' + item.item_type;
					}
					return item.type;
				}
			}
		];

		this.state = {
			showSpinner: true,
			includeFlavor: false,
			rewardTableColumns: _columns,
			// By default, sort the voyage rewards table by type and rarity to show crew first
			sorted: [{ id: 'type', desc: false }, { id: 'rarity', desc: true }]
		};

		this.reloadVoyageState();
	}

	componentDidMount() {
		// Every 5 minutes refresh
		// TODO: this should be configurable
		const refreshInterval = 5 * 60;
		this.intervalLogRefresh = setInterval(() => this.reloadVoyageState(), refreshInterval * 1000);
	}

	componentWillUnmount() {
		clearInterval(this.intervalLogRefresh);
	}

	async reloadVoyageState() {
		let voyage = STTApi.playerData.character.voyage[0];
		if (voyage && voyage.id) {
			let voyageNarrative = await loadVoyage(voyage.id, false);

			//<Checkbox checked={this.state.includeFlavor} label="Include flavor entries" onChange={(e, isChecked) => { this.setState({ includeFlavor: isChecked }); }} />
			if (!this.state.includeFlavor) {
				// Remove the "flavor" entries (useless text)
				voyageNarrative = voyageNarrative.filter(e => e.encounter_type !== 'flavor');
			}

			// Group by index
			voyageNarrative = voyageNarrative.reduce(function(r, a) {
				r[a.index] = r[a.index] || [];
				r[a.index].push(a);
				return r;
			}, Object.create(null));

			let voyageRewards = voyage.pending_rewards.loot;
			let iconPromises = [];
			voyageRewards.forEach(reward => {
				reward.iconUrl = '';
				if (reward.icon.atlas_info) {
					// This is not fool-proof, but covers currently known sprites
					reward.iconUrl = CONFIG.SPRITES[reward.icon.file].url;
				} else {
					iconPromises.push(
						STTApi.imageProvider
							.getItemImageUrl(reward, reward)
							.then(found => {
								found.id.iconUrl = found.url;
							})
							.catch(error => {
								/*console.warn(error);*/
							})
					);
				}
			});

			await Promise.all(iconPromises);

			let ship_name = voyage.ship_name;
			if (!ship_name) {
				let ship = STTApi.ships.find(ship => ship.id === voyage.ship_id);
				ship_name = ship ? ship.name : '-BUGBUG-';
			}

			this.setState({
				showSpinner: false,
				ship_name: ship_name,
				ship_id: voyage.ship_id,
				created_at: voyage.created_at,
				voyage_duration: voyage.voyage_duration,
				seconds_since_last_dilemma: voyage.seconds_since_last_dilemma,
				seconds_between_dilemmas: voyage.seconds_between_dilemmas,
				skill_aggregates: voyage.skill_aggregates,
				crew_slots: voyage.crew_slots,
				voyage: voyage,
				voyageNarrative: voyageNarrative,
				estimatedMinutesLeft: voyage.hp / 21,
				estimatedMinutesLeftRefill: voyage.hp / 21,
				nativeEstimate: false,
				voyageRewards: voyageRewards
			});

			// Avoid estimating if voyage is not ongoing
			if (voyage.state !== 'recalled' && voyage.state !== 'failed') {
				this._betterEstimate();
			}
		}
	}

	renderVoyageState() {
		if (this.state.voyage.state === 'recalled') {
			return (
				<p>
					Voyage has lasted for {formatTimeSeconds(this.state.voyage_duration)} and it's currently returning (
					{formatTimeSeconds(this.state.voyage.recall_time_left)} left).
				</p>
			);
		} else if (this.state.voyage.state === 'failed') {
			return (
				<p>
					Voyage has run out of antimatter after {formatTimeSeconds(this.state.voyage_duration)} and it's waiting to be abandoned or
					replenished.
				</p>
			);
		} else {
			const getDilemmaChance = (estimatedMinutesLeft) => {
				let minEstimate = (estimatedMinutesLeft * 0.75 - 1) * 60;
				let maxEstimate = estimatedMinutesLeft * 60;

				let chanceDilemma =
					(100 * (this.state.seconds_between_dilemmas - this.state.seconds_since_last_dilemma - minEstimate)) / (maxEstimate - minEstimate);
				chanceDilemma = (100 - Math.min(Math.max(chanceDilemma, 0), 100)).toFixed();

				return chanceDilemma;
			};

			return (
				<div>
					<p>
						Voyage has been ongoing for {formatTimeSeconds(this.state.voyage_duration)} (new dilemma in{' '}
						{formatTimeSeconds(this.state.seconds_between_dilemmas - this.state.seconds_since_last_dilemma)}).
					</p>

					<div className='ui blue label'>
						Estimated time left: {formatTimeSeconds(this.state.estimatedMinutesLeft * 60)}
						{!this.state.nativeEstimate && <i className='spinner loading icon' />}
					</div>

					<div className='ui blue label'>
						Estimated time left (+1 refill): {formatTimeSeconds(this.state.estimatedMinutesLeftRefill * 60)}
						{!this.state.nativeEstimate && <i className='spinner loading icon' />}
					</div>

					<div className='ui blue label'>
						Estimated revival cost: {Math.floor((this.state.voyage.voyage_duration / 60 + this.state.estimatedMinutesLeft) / 5)} dilithium
					</div>

					<p>There is an estimated {getDilemmaChance(this.state.estimatedMinutesLeft)}% chance for the voyage to reach next dilemma.</p>
				</div>
			);
		}
	}

	async _betterEstimate() {
		const assignedCrew = this.state.voyage.crew_slots.map(slot => slot.crew.id);
		const assignedRoster = STTApi.roster.filter(crew => assignedCrew.includes(crew.crew_id));

		let options = {
			// first three not needed for estimate calculation
			searchDepth: 0,
			extendsTarget: 0,
			shipAM: 0,
			skillPrimaryMultiplier: 3.5,
			skillSecondaryMultiplier: 2.5,
			skillMatchingMultiplier: 1.1,
			traitScoreBoost: 200,
			voyage_description: STTApi.playerData.character.voyage_descriptions[0],
			roster: assignedRoster,
			// Estimate-specific parameters
			voyage_duration: this.state.voyage.voyage_duration,
			remainingAntiMatter: this.state.voyage.hp,
			assignedCrew
		};

		estimateVoyageRemaining(options, estimate => {
			this.setState({ estimatedMinutesLeft: estimate });

			options.remainingAntiMatter += this.state.voyage.max_hp;
			estimateVoyageRemaining(options, estimate => {
				this.setState({ estimatedMinutesLeftRefill: estimate, nativeEstimate: true });
			});
		});
	}

	renderDilemma() {
		if (this.state.voyage.dilemma && this.state.voyage.dilemma.id) {
			return (
				<div>
					<h3 key={0} className='ui top attached header'>
						Dilemma - <span dangerouslySetInnerHTML={{ __html: this.state.voyage.dilemma.title }} />
					</h3>
					,
					<div key={1} className='ui center aligned inverted attached segment'>
						<div>
							<span dangerouslySetInnerHTML={{ __html: this.state.voyage.dilemma.intro }} />
						</div>
						<div className='ui middle aligned inverted'>
							{this.state.voyage.dilemma.resolutions.map((resolution, index) => {
								if (resolution.locked) {
									return (
										<div className='item' key={index} style={{ margin: '3px 0' }}>
											<div className='content'>
												<div className='header'>
													LOCKED - <span dangerouslySetInnerHTML={{ __html: resolution.option }} />
												</div>
											</div>
										</div>
									);
								} else {
									return (
										<div className='item' key={index} style={{ margin: '3px 0' }}>
											<img src={CONFIG.SPRITES['icon_' + resolution.skill].url} height={18} />
											<div className='content'>
												<div className='header'>
													<span dangerouslySetInnerHTML={{ __html: resolution.option }} />
												</div>
											</div>
										</div>
									);
								}
							})}
						</div>
					</div>
				</div>
			);
		} else {
			return <span />;
		}
	}

	render() {
		if (this.state.showSpinner) {
			return (
				<div className='centeredVerticalAndHorizontal'>
					<div className='ui massive centered text active inline loader'>Loading voyage details...</div>
				</div>
			);
		}

		const defaultButton = props => (
			<Button {...props} style={{ width: '100%' }}>
				{props.children}
			</Button>
		);

		return (
			<div style={{ userSelect: 'initial' }}>
				<h3>Voyage on the {this.state.ship_name}</h3>
				{this.renderVoyageState()}
				{this.renderDilemma()}
				<p>
					Antimatter remaining: {this.state.voyage.hp} / {this.state.voyage.max_hp}.
				</p>
				<table style={{ borderSpacing: '0' }}>
					<tbody>
						<tr>
							<td>
								<section>
									<h4>Full crew complement and skill aggregates</h4>
									<ul>
										{this.state.crew_slots.map(slot => {
											return (
												<li key={slot.symbol}>
													<span className='quest-mastery'>
														{slot.name} &nbsp;{' '}
														<img src={STTApi.roster.find(rosterCrew => rosterCrew.id == slot.crew.archetype_id).iconUrl} height={20} />{' '}
														&nbsp; {slot.crew.name}
													</span>
												</li>
											);
										})}
									</ul>
								</section>
							</td>
							<td>
								<ul>
									{Object.values(this.state.voyage.skill_aggregates).map(skill => {
										return (
											<li key={skill.skill}>
												<span className='quest-mastery'>
													<img src={CONFIG.SPRITES['icon_' + skill.skill].url} height={18} /> &nbsp; {skill.core} ({skill.range_min}-
													{skill.range_max})
												</span>
											</li>
										);
									})}
								</ul>
							</td>
						</tr>
					</tbody>
				</table>

				<h3>{'Pending rewards (' + this.state.voyageRewards.length + ')'}</h3>
				<div className='voyage-rewards-grid'>
					<ReactTable
						data={this.state.voyageRewards}
						columns={this.state.rewardTableColumns}
						sorted={this.state.sorted}
						onSortedChange={sorted => this.setState({ sorted })}
						className='-striped -highlight'
						defaultPageSize={10}
						pageSize={10}
						showPagination={this.state.voyageRewards.length > 10}
						showPageSizeOptions={false}
						NextComponent={defaultButton}
						PreviousComponent={defaultButton}
					/>
				</div>
				<br />
				<CollapsibleSection title={"Complete Captain's Log (" + Object.keys(this.state.voyageNarrative).length + ')'}>
					{Object.keys(this.state.voyageNarrative).map(key => {
						return <VoyageLogEntry key={key} log={this.state.voyageNarrative[key]} />;
					})}
				</CollapsibleSection>
				<br />
			</div>
		);
	}
}

export class VoyageTools extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			showCalcAnyway: false
		};
	}

	_onRefreshNeeded() {
		this.forceUpdate();
	}

	componentDidMount() {
		this._updateCommandItems();
	}

	_updateCommandItems() {
		if (this.props.onCommandItemsUpdate) {
			const activeVoyage = STTApi.playerData.character.voyage.length > 0;

			if (activeVoyage) {
				this.props.onCommandItemsUpdate([
					{
						key: 'exportExcel',
						name: this.state.showCalcAnyway ? 'Switch to log' : 'Switch to recommendations',
						iconProps: { iconName: 'Switch' },
						onClick: () => {
							this.setState({ showCalcAnyway: !this.state.showCalcAnyway }, () => {
								this._updateCommandItems();
							});
						}
					}
				]);
			} else {
				this.props.onCommandItemsUpdate([]);
			}
		}
	}

	render() {
		const activeVoyage = STTApi.playerData.character.voyage.length > 0;

		return (
			<div className='tab-panel' data-is-scrollable='true'>
				{(!activeVoyage || this.state.showCalcAnyway) && <VoyageCrew onRefreshNeeded={() => this._onRefreshNeeded()} />}
				{activeVoyage && !this.state.showCalcAnyway && <VoyageLog />}
			</div>
		);
	}
}

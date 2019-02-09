import React from 'react';
import { Label } from 'office-ui-fabric-react/lib/Label';
import { MessageBar, MessageBarType } from 'office-ui-fabric-react/lib/MessageBar';
import { SpinButton } from 'office-ui-fabric-react/lib/SpinButton';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';
import { Persona, PersonaSize, PersonaPresence } from 'office-ui-fabric-react/lib/Persona';
import { getTheme } from '@uifabric/styling';

// #!if ENV === 'electron'
import Logger from '../utils/logger';
// #!endif

import { download } from '../utils/pal';

import STTApi from 'sttapi';
import {
	CONFIG, loadGauntlet, gauntletCrewSelection, gauntletRoundOdds,
	formatCrewStats, formatTimeSeconds
} from 'sttapi';

class GauntletCrew extends React.Component {
	render() {
		return <div className="ui compact segments" style={{ textAlign: 'center', margin: '8px' }}>
			<h5 className="ui top attached header" style={{ color: getTheme().palette.neutralDark, backgroundColor: getTheme().palette.themeLighter, padding: '2px' }}>{STTApi.getCrewAvatarBySymbol(this.props.crew.archetype_symbol).name}</h5>
			<div className="ui attached segment" style={{ backgroundColor: getTheme().palette.themeLighter, padding: '0' }}>
				<div style={{ position: 'relative', display: 'inline-block' }}>
					<img src={STTApi.getCrewAvatarBySymbol(this.props.crew.archetype_symbol).iconUrl} className={this.props.crew.disabled ? 'image-disabled' : ''} height={Math.min(200, this.props.maxwidth)} />
					<div className={"ui circular label " + (this.props.crew.disabled ? "red" : "green")} style={{ position: 'absolute', right: '0', top: '0' }}>{this.props.crew.crit_chance}%</div>
				</div>
			</div>
			<div className="ui attached segment" style={{ backgroundColor: getTheme().palette.themeLighter, padding: '2px' }}>
				{this.props.crew.debuff / 4} battles
			</div>
			{this.props.showStats && <div className="ui attached segment" style={{ backgroundColor: getTheme().palette.themeLighter, padding: '2px' }}>
				{this.props.crew.skills.map((skill) =>
					<span className='gauntletCrew-statline' key={skill.skill}>
						<img src={CONFIG.SPRITES['icon_' + skill.skill].url} height={18} /> {CONFIG.SKILLS[skill.skill]} ({skill.min} - {skill.max})
					</span>
				)}
				<p className='gauntletCrew-statline'>Crit chance {this.props.crew.crit_chance}%</p>
			</div>}
			<div className="ui bottom attached primary button" onClick={() => this.props.revive(this.props.crew.disabled)}>
				<i className="money bill alternate outline icon"></i>
				{this.props.crew.disabled ? 'Revive (30 dil)' : 'Restore (30 dil)'}
			</div>
		</div>;
	}
}

class CircularLabel extends React.Component {
	constructor(props) {
		super(props);
	}

	// http://stackoverflow.com/a/3943023/112731
	getLuminance(c) {
		let i, x;
		const a = [];
		for (i = 0; i < c.length; i++) {
			x = c[i] / 255;
			a[i] = x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
		}
		return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
	}

	render() {
		let backColor;
		if (this.props.percent < 6) {
			backColor = [parseInt('0xa7'), parseInt('0xbd'), parseInt('0x0d')];
		} else if (this.props.percent < 26) {
			backColor = [parseInt('0xfb'), parseInt('0xbd'), parseInt('0x08')];
		} else if (this.props.percent < 46) {
			backColor = [parseInt('0xf2'), parseInt('0x71'), parseInt('0x1c')];
		} else {
			backColor = [parseInt('0xdb'), parseInt('0x28'), parseInt('0x28')];
		}

		let color;
		if (this.getLuminance(backColor) > Math.sqrt(1.05 * 0.05) - 0.05) {
			color = 'black';
		} else {
			color = 'white';
		}

		const padz = (str) => ('00' + str).slice(-2);

		return <div className="ui circular label" style={{
			position: 'absolute', left: '0', bottom: '0',
			backgroundColor: `#${backColor.map(c => padz(c.toString(16))).join('')}`,
			color: color
		}}>
			{this.props.percent}%
		</div >;
	}
}

class GauntletMatch extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		//TODO: 320px hardcoded below!
		let containerStyle = {
			padding: '3px',
			backgroundColor: getTheme().palette.themeLighter,
			display: 'grid',
			gridTemplateColumns: '100px auto 12px auto 100px',
			gridTemplateRows: '14px 46px 50px 32px',
			gridTemplateAreas: `
			"pcrewname pcrewname . ocrewname ocrewname"
			"pcrewimage stats stats stats ocrewimage"
			"pcrewimage chance chance chance ocrewimage"
			"pcrewimage button button button ocrewimage"`};

		return <div className="ui compact segments" style={{ margin: 'unset' }}>
			<h5 className="ui top attached header" style={{ color: getTheme().palette.neutralDark, backgroundColor: getTheme().palette.themeLighter, textAlign: 'center', padding: '2px' }}>
				vs {this.props.match.opponent.name} (rank {this.props.match.opponent.rank})
			</h5>
			<div style={containerStyle} className="ui attached segment">
				<span style={{ gridArea: 'pcrewname', justifySelf: 'center' }}>{STTApi.getCrewAvatarBySymbol(this.props.match.crewOdd.archetype_symbol).short_name}</span>
				<div style={{ gridArea: 'pcrewimage', position: 'relative' }}>
					<img src={this.props.match.crewOdd.iconUrl} height={128} />
					<CircularLabel percent={this.props.match.crewOdd.crit_chance} />
				</div>

				<div style={{ gridArea: 'stats' }}>
					<table style={{ width: '100%' }}>
						<tbody>
							<tr>
								<td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{this.props.match.crewOdd.min[0]}-{this.props.match.crewOdd.max[0]}</td>
								<td style={{ textAlign: 'center' }}><img src={CONFIG.SPRITES['icon_' + this.props.gauntlet.contest_data.primary_skill].url} height={18} /></td>
								<td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{this.props.match.opponent.min[0]}-{this.props.match.opponent.max[0]}</td>
							</tr>
							<tr>
								<td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{this.props.match.crewOdd.min[1]}-{this.props.match.crewOdd.max[1]}</td>
								<td style={{ textAlign: 'center' }}><img src={CONFIG.SPRITES['icon_' + this.props.gauntlet.contest_data.secondary_skill].url} height={18} /></td>
								<td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{this.props.match.opponent.min[1]}-{this.props.match.opponent.max[1]}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div style={{ gridArea: 'chance', justifySelf: 'center', alignSelf: 'center' }}>
					<p style={{ fontSize: '1.5rem', fontWeight: '800', margin: '4px', paddingTop: '18px', lineHeight: '1.5em' }}><b>{this.props.match.chance}%</b> chance</p>
					<p style={{ fontSize: '1.2rem', fontWeight: '700', margin: '4px', lineHeight: '1.2em' }}><b>{this.props.match.opponent.value}</b> points</p>
				</div>

				<div style={{ gridArea: 'button', justifySelf: 'center', alignSelf: 'center' }}>
				</div>

				<div style={{ gridArea: 'ocrewimage', position: 'relative' }}>
					<img src={this.props.match.opponent.iconUrl} height={128} />
					<CircularLabel percent={this.props.match.opponent.crit_chance} />
				</div>

				<span style={{ gridArea: 'ocrewname', justifySelf: 'center' }}>{STTApi.getCrewAvatarBySymbol(this.props.match.opponent.archetype_symbol).short_name}</span>
			</div>
		</div>;
	}
}

export class GauntletHelper extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			gauntlet: null,
			lastResult: null,
			lastErrorMessage: null,
			rewards: null,
			// Recommendation calculation settings
			featuredSkillBonus: 10,
			critBonusDivider: 3,
			includeFrozen: false,
			calculating: false,
			logPath: undefined,
			showSpinner: true,
			showStats: false,
			windowWidth: 0,
			windowHeight: 0
		};

		this._reloadGauntletData = this._reloadGauntletData.bind(this);
		this._gauntletDataRecieved = this._gauntletDataRecieved.bind(this);
		this._calculateSelection = this._calculateSelection.bind(this);
		this._exportLog = this._exportLog.bind(this);
		this._reloadGauntletData();
		this.updateWindowDimensions = this.updateWindowDimensions.bind(this);
	}

	updateWindowDimensions() {
		this.setState({ windowWidth: window.innerWidth, windowHeight: window.innerHeight });
	}

	componentDidMount() {
		this._updateCommandItems();

		this.updateWindowDimensions();
		window.addEventListener('resize', this.updateWindowDimensions);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.updateWindowDimensions);
	}

	_updateCommandItems() {
		if (this.props.onCommandItemsUpdate) {
			let commandItems = [];
			if (this.state.logPath) {
				commandItems.push({
					key: 'exportCsv',
					name: 'Export log...',
					iconProps: { iconName: 'ExcelDocument' },
					onClick: () => this._exportLog()
				});
			}

			commandItems.push({
				key: 'settings',
				text: 'Settings',
				iconProps: { iconName: 'Equalizer' },
				subMenuProps: {
					items: [{
						key: 'bestFirst',
						text: 'Best match first',
						canCheck: true,
						isChecked: this.state.bestFirst,
						onClick: () => {
							let isChecked = !this.state.bestFirst;
							this.setState({
								bestFirst: isChecked
							}, () => { this._updateCommandItems(); });
						}
					},{
						key: 'showStats',
						text: 'Show crew stats in top row',
						canCheck: true,
						isChecked: this.state.showStats,
						onClick: () => {
							this.setState({ showStats: !this.state.showStats }, () => { this._updateCommandItems(); });
						}
					}]
				}
			});

			this.props.onCommandItemsUpdate(commandItems);
		}
	}

	_reloadGauntletData() {
		loadGauntlet().then((data) => this._gauntletDataRecieved({ gauntlet: data }));
	}

	_gauntletDataRecieved(data, logPath, match) {
		if (data.gauntlet) {
			if (data.gauntlet.state == 'NONE') {
				this.setState({
					gauntlet: data.gauntlet,
					lastErrorMessage: null,
					lastResult: null,
					startsIn: formatTimeSeconds(data.gauntlet.seconds_to_join),
					featuredSkill: data.gauntlet.contest_data.featured_skill,
					traits: data.gauntlet.contest_data.traits.map(function (trait) { return STTApi.getTraitName(trait); }.bind(this))
				});
			}
			else if (data.gauntlet.state == 'STARTED') {
				// TODO: make this a configuration option (lower value will make gauntlet refresh faster, but percentage will be less accurate)
				let simulatedRounds = 20000;
				var result = gauntletRoundOdds(data.gauntlet, simulatedRounds);
				this.setState({
					gauntlet: data.gauntlet,
					roundOdds: result
				});

				let iconPromises = [];

				data.gauntlet.contest_data.selected_crew.forEach((crew) => {
					iconPromises.push(
						STTApi.imageProvider.getCrewImageUrl(STTApi.getCrewAvatarBySymbol(crew.archetype_symbol), true, crew.crew_id).then(({ id, url }) => {
							this.state.gauntlet.contest_data.selected_crew.forEach((crew) => {
								if (crew.crew_id === id) {
									crew.iconUrl = url;
								}
							});
							return Promise.resolve();
						}).catch((error) => { /*console.warn(error);*/ }));
				});

				result.matches.forEach((match) => {
					iconPromises.push(
						STTApi.imageProvider.getCrewImageUrl(STTApi.getCrewAvatarBySymbol(match.crewOdd.archetype_symbol), true, match.crewOdd.crew_id).then(({ id, url }) => {
							this.state.roundOdds.matches.forEach((match) => {
								if (match.crewOdd.crew_id === id) {
									match.crewOdd.iconUrl = url;
								}
							});
							return Promise.resolve();
						}).catch((error) => { /*console.warn(error);*/ }));

					iconPromises.push(
						STTApi.imageProvider.getCrewImageUrl(STTApi.getCrewAvatarBySymbol(match.opponent.archetype_symbol), true, match.opponent.crew_id).then(({ id, url }) => {
							this.state.roundOdds.matches.forEach((match) => {
								if (match.opponent.crew_id === id) {
									match.opponent.iconUrl = url;
								}
							});
							return Promise.resolve();
						}).catch((error) => { /*console.warn(error);*/ }));
				});

				Promise.all(iconPromises).then(() => this.forceUpdate());
			}
			else {
				this.setState({
					gauntlet: data.gauntlet
				});
			}
		}
		else if (data.gauntlet.state == 'UNSTARTED') {
			// You joined a gauntled and are waiting for opponents
		}
		else if (data.gauntlet.state == 'ENDED_WITH_REWARDS') {
			// The gauntlet ended and you got some rewards
		}

		if (data.lastResult) {
			this.setState({
				lastResult: Object.assign(data.lastResult, { match: match }),
				rewards: data.rewards
			});
		}

		// #!if ENV === 'electron'
		if (!logPath && data.gauntlet) {
			logPath = Logger.hasGauntletLog(data.gauntlet.gauntlet_id);
		}
		// #!endif

		this.setState({ logPath: logPath, showSpinner: false }, () => { this._updateCommandItems(); });
	}

	_calculateSelection() {
		this.setState({ calculating: true })
		var result = gauntletCrewSelection(this.state.gauntlet, STTApi.roster, (100 + this.state.featuredSkillBonus) / 100, this.state.critBonusDivider, 5 /*preSortCount*/, this.state.includeFrozen);
		this.setState({ crewSelection: result.recommendations, calculating: false });
	}

	renderBestCrew() {
		if (!this.state.crewSelection) {
			return <span />;
		}

		let crewSpans = [];
		this.state.crewSelection.forEach(id => {
			let crew = STTApi.roster.find(crew => (crew.crew_id === id) || (crew.id === id));

			let crewSpan = <Persona
				key={crew.name}
				imageUrl={crew.iconUrl}
				text={crew.name}
				secondaryText={crew.short_name}
				tertiaryText={formatCrewStats(crew)}
				size={PersonaSize.large}
				presence={(crew.frozen === 0) ? PersonaPresence.online : PersonaPresence.away} />

			crewSpans.push(crewSpan);
		});

		return (<div>
			<h3>Best crew</h3>
			{this.state.calculating && <div className="ui medium centered text active inline loader">Still calculating...</div>}
			<div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
				{crewSpans}
			</div>
		</div>);
	}

	renderStatistic(value, label, classAdd) {
		let classSize = '';
		if (this.state.windowWidth < 1200) { classSize = 'small'; }
		if (this.state.windowWidth < 800) { classSize = 'tiny'; }
		if (this.state.windowWidth < 500) { classSize = 'mini'; }
		return <div className={`${classAdd} ui ${classSize} statistic`}>
			<div className="value" style={{ color: classAdd || 'unset' }}>{value}</div>
			<div className="label" style={{ color: 'unset' }}>{label}</div>
		</div>;
	}

	render() {
		if (this.state.showSpinner) {
			return <div className="centeredVerticalAndHorizontal">
				<div className="ui massive centered text active inline loader">Loading gauntlet details...</div>
			</div>;
		}

		if (this.state.gauntlet && (this.state.gauntlet.state == 'NONE')) {
			return (
				<div>
					<Label>Next gauntlet starts in {this.state.startsIn}.</Label>
					<span className='quest-mastery'>Featured skill: <img src={CONFIG.SPRITES['icon_' + this.state.featuredSkill].url} height={18} /> {CONFIG.SKILLS[this.state.featuredSkill]}</span>
					<Label>Featured traits: {this.state.traits.join(', ')}</Label>

					{this.renderBestCrew()}

					<div className="ui grid" style={{ maxWidth: '600px' }}>
						<div className="row">
							<div className="column"><h4>Algorithm settings</h4></div>
						</div>

						<div className="two column row">
							<div className="column">
								<SpinButton value={this.state.featuredSkillBonus} label='Featured skill bonus:' min={0} max={100} step={1}
									onIncrement={(value) => { this.setState({ featuredSkillBonus: +value + 1 }); }}
									onDecrement={(value) => { this.setState({ featuredSkillBonus: +value - 1 }); }}
									onValidate={(value) => {
										if (isNaN(+value)) {
											this.setState({ featuredSkillBonus: 10 });
											return 10;
										}

										return +value;
									}}
								/>
							</div>
							<div className="column">
								The higher this number, the more bias applied towards the featured skill during crew selection
							</div>
						</div>

						<div className="two column row">
							<div className="column">
								<SpinButton value={this.state.critBonusDivider} label='Crit bonus divider:' min={0.1} max={100} step={0.1}
									onIncrement={(value) => { this.setState({ critBonusDivider: +value + 0.1 }); }}
									onDecrement={(value) => { this.setState({ critBonusDivider: +value - 0.1 }); }}
									onValidate={(value) => {
										if (isNaN(+value)) {
											this.setState({ critBonusDivider: 3 });
											return 3;
										}

										return +value;
									}}
								/>
							</div>
							<div className="column">
								The lower this number, the more bias applied towards crew with higher crit bonus rating during selection
							</div>
						</div>

						<div className="row">
							<div className="column">
								<Checkbox checked={this.state.includeFrozen} label="Include frozen crew"
									onChange={(e, isChecked) => { this.setState({ includeFrozen: isChecked }); }}
								/>
							</div>
						</div>
					</div>

					<br />

					<div style={{ display: 'grid', gridGap: '5px', width: 'fit-content', gridTemplateColumns: 'max-content max-content' }}>
						<div className={"ui primary button" + (this.state.calculating ? ' disabled' : '')} onClick={this._calculateSelection}>Calculate best crew selection</div>
					</div>
				</div>
			);
		}
		else if (this.state.gauntlet && ((this.state.gauntlet.state == 'STARTED') && this.state.roundOdds)) {
			let playerCrew, opponentCrew, playerRoll, opponentRoll, playerRollMsg, opponentRollMsg;

			if (this.state.lastResult && this.state.lastResult.match) {
				playerCrew = STTApi.getCrewAvatarBySymbol(this.state.lastResult.match.crewOdd.archetype_symbol).name;
				opponentCrew = STTApi.getCrewAvatarBySymbol(this.state.lastResult.match.opponent.archetype_symbol).name;

				playerRoll = this.state.lastResult.player_rolls.reduce((sum, value) => { return sum + value; }, 0);
				opponentRoll = this.state.lastResult.opponent_rolls.reduce((sum, value) => { return sum + value; }, 0);

				playerRollMsg = [];
				opponentRollMsg = [];
				for (let i = 0; i < 6; i++) {
					playerRollMsg.push(`${this.state.lastResult.player_rolls[i]}${this.state.lastResult.player_crit_rolls[i] ? '*' : ''}`);
					opponentRollMsg.push(`${this.state.lastResult.opponent_rolls[i]}${this.state.lastResult.opponent_crit_rolls[i] ? '*' : ''}`);
				}
			}

			let matches = this.state.roundOdds.matches;
			let sortCrit = (match) => match.chance;
			if (this.state.bestFirst) {
				sortCrit = (match) => (match.chance > 0) ? (match.chance + match.opponent.value / 4.5) : 0;
			}
			matches.sort((a, b) => sortCrit(b) - sortCrit(a));

			return (
				<div className='tab-panel' data-is-scrollable='true'>
					<span className='quest-mastery'>Featured skill is <img src={CONFIG.SPRITES['icon_' + this.state.gauntlet.contest_data.featured_skill].url} height={18} /> {CONFIG.SKILLS[this.state.gauntlet.contest_data.featured_skill]}; Featured traits are {this.state.gauntlet.contest_data.traits.map(trait => STTApi.getTraitName(trait)).join(", ")}</span>

					{this.state.lastErrorMessage && <p>Error: '{this.state.lastErrorMessage}'</p>}

					<div className="ui compact segments" style={{ margin: '8px' }}>
						<h5 className="ui top attached header" style={{ color: getTheme().palette.neutralDark, backgroundColor: getTheme().palette.themeLighter, textAlign: 'center', padding: '2px' }}>
							The gauntlet ends in {formatTimeSeconds(this.state.gauntlet.seconds_to_end)}
						</h5>
						<div className="ui attached segment" style={{ backgroundColor: getTheme().palette.themeLighter }}>
							{this.renderStatistic(formatTimeSeconds(this.state.gauntlet.seconds_to_next_crew_refresh), 'Crew refresh')}
							{this.renderStatistic(this.state.roundOdds.rank, 'Your rank')}
							{this.renderStatistic(this.state.roundOdds.consecutive_wins, 'Consecutive wins')}
							{this.renderStatistic(STTApi.playerData.premium_earnable, 'Merits')}
							{this.state.lastResult && this.renderStatistic(((this.state.lastResult.win === true) ? 'WON' : 'LOST'), 'Last round', ((this.state.lastResult.win === true) ? 'green' : 'red'))}
						</div>
						{this.state.lastResult && this.state.lastResult.match && <div className="ui attached segment" style={{ backgroundColor: getTheme().palette.themeLighterAlt }}>
							<p>Your <b>{playerCrew}</b> rolled <b>{playerRoll}</b> ({playerRollMsg.join(', ')})</p>
							<p><i>{this.state.lastResult.match.opponent.name}</i>'s <b>{opponentCrew}</b> rolled <b>{opponentRoll}</b> ({opponentRollMsg.join(', ')})</p>
							<p>Match had a <b>{this.state.lastResult.match.chance}%</b> chance of success; you got <b>{this.state.lastResult.value} points</b>.</p>
							{this.state.rewards &&
								<p>
									<span>Rewards: </span>
									{this.state.rewards.loot.map((loot, index) =>
										<span key={index} style={{ color: loot.rarity && CONFIG.RARITIES[loot.rarity].color }}>{loot.quantity} {(loot.rarity == null) ? '' : CONFIG.RARITIES[loot.rarity].name} {loot.full_name}</span>
									).reduce((prev, curr) => [prev, ', ', curr])}
								</p>
							}
						</div>}
						<div className="ui two bottom attached buttons">
							<div className="ui button" onClick={this._reloadGauntletData}>
								<i className="retweet icon"></i>
								Reload data
							</div>
						</div>
					</div>

					<br />

					<div style={{ display: 'grid', gridGap: '10px', margin: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
						{matches.map((match) =>
							<GauntletMatch key={match.crewOdd.archetype_symbol + match.opponent.player_id} match={match} gauntlet={this.state.gauntlet} consecutive_wins={this.state.roundOdds.consecutive_wins} onNewData={this._gauntletDataRecieved} />
						)}
					</div>
				</div>
			);
		} else if (this.state.gauntlet && (this.state.gauntlet.state == 'ENDED_WITH_REWARDS')) {
			return <div>
				<h3>Gauntlet ended, your final rank was <b>{this.state.gauntlet.rank}</b>.</h3>
				<p>Claim rewards in the game client!</p>
			</div>;
		}
		else {
			return (<MessageBar messageBarType={MessageBarType.error} >Unknown state for this gauntlet! Check the app, perhaps it's waiting to join or already done.</MessageBar>);
		}
	}

	async _exportLog() {
		// #!if ENV === 'electron'
		let csv = await Logger.exportGauntletLog(this.state.gauntlet.gauntlet_id);
		download(`gauntlet_${this.state.gauntlet.gauntlet_id}.csv`, csv, 'Export gauntlet log', 'Export');
		// #!endif
	}
}
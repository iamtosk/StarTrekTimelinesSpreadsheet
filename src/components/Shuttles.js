import React from 'react';

import { Image, Item, List, Dropdown } from 'semantic-ui-react';

import STTApi from 'sttapi';
import { CONFIG, formatTimeSeconds } from 'sttapi';

export class Shuttles extends React.Component {
	constructor(props) {
		super(props);

		let currentEvent = undefined;
		if (
			STTApi.playerData.character.events &&
			STTApi.playerData.character.events.length > 0 &&
			STTApi.playerData.character.events[0].content.content_type === 'shuttles' &&
			STTApi.playerData.character.events[0].opened
		) {
			// In a shuttle event
			let event = STTApi.playerData.character.events[0];

			STTApi.imageProvider
				.getImageUrl(event.phases[event.opened_phase].splash_image.file, event.id)
				.then(found => {
					this.setState({ eventImageUrl: found.url });
				})
				.catch(error => {
					console.warn(error);
				});

			let crew_bonuses = [];
			for (let cb in event.content.shuttles[0].crew_bonuses) {
				let avatar = STTApi.getCrewAvatarBySymbol(cb);
				if (!avatar) {
					continue;
				}

				crew_bonuses.push({
					avatar,
					bonus: event.content.shuttles[0].crew_bonuses[cb],
					iconUrl: STTApi.imageProvider.getCrewCached(avatar, false)
				});
			}

			let eventVP = event.content.shuttles[0].shuttle_mission_rewards.find(r => r.type === 11);
			currentEvent = {
				name: event.name,
				description: event.description,
				crew_bonuses: crew_bonuses,
				tokens: event.content.shuttles.map(s => s.token),
				nextVP: eventVP ? eventVP.quantity : 0
			};
		}

		this.slotCalculator();

		this.state = {
			currentEvent,
			eventImageUrl: undefined
		};
	}

	calcCrew(shuttle) {
		const getCrewSkill = (crew, skill) => {
			let val = crew[skill + '_core'];
			if (crew.tired) {
				val *= STTApi.serverConfig.config.conflict.tired_crew_coefficient;
			}

			return val;
		};

		const calcSkill = (slot, crew, boost) => {
			let secondary_skill_percentage = STTApi.serverConfig.config.shuttle_adventures.secondary_skill_percentage;

			let winnerComboVal = 0;
			let totalFromBoost = 0;
			slot.skills.forEach(skill => {
				let andSkills = skill.split(',');

				andSkills.forEach(ors => {
					if (boost && boost.bonuses && boost.bonuses[ors]) {
						totalFromBoost += boost.bonuses[ors].core;
					}
				});

				andSkills = andSkills
					.map(ors => getCrewSkill(crew, ors))
					.sort()
					.reverse();

				let val = 0;
				for (let k = 0; k < andSkills.Length; k++) {
					if (k == 0) {
						val += andSkills[k];
					} else {
						val += andSkills[k] * secondary_skill_percentage;
					}
				}

				val += totalFromBoost;

				winnerComboVal = Math.max(winnerComboVal, val);
			});

			// TODO: what is slot.trait_bonuses? Looks like an empty object; never used

			let bonusMultiplier = 1; // TODO get bonus for crew from current event

			return winnerComboVal * bonusMultiplier;
		};

		let skillSum = 0;
		shuttle.slots.forEach(slot => {
			skillSum += calcSkill(slot, crew, boost);
		});

		let challengeRating = shuttleAdventure.challenge_rating * shuttle.slots.length;
		let sigmoid_steepness = STTApi.serverConfig.config.shuttle_adventures.sigmoid_steepness;
		let sigmoid_midpoint = STTApi.serverConfig.config.shuttle_adventures.sigmoid_midpoint;
		let percent = 1 / (1 + Math.exp(-sigmoid_steepness * (skillSum / challengeRating - sigmoid_midpoint)));

		let actualPercent = percent * 100;
	}

	_shuttleChance(challenge_rating, numberofSlots, skillSum) {
		return Math.floor(
			100 /
				(1 +
					Math.exp(
						STTApi.serverConfig.config.shuttle_adventures.sigmoid_steepness *
							(STTApi.serverConfig.config.shuttle_adventures.sigmoid_midpoint - skillSum / (challenge_rating * numberofSlots))
					))
		);
	}

	slotCalculator() {
		let crew_bonuses = {};
		if (
			STTApi.playerData.character.events &&
			STTApi.playerData.character.events.length > 0 &&
			STTApi.playerData.character.events[0].content.content_type === 'shuttles' &&
			STTApi.playerData.character.events[0].opened
		) {
			// In a shuttle event
			let event = STTApi.playerData.character.events[0];
			crew_bonuses = event.content.shuttles[0].crew_bonuses;
		}

		let sortedRoster = [];
		STTApi.roster.forEach(crew => {
			if (crew.buyback || crew.frozen) {
				return;
			}

			let bonus = 1;
			if (crew_bonuses[crew.symbol]) {
				bonus = crew_bonuses[crew.symbol];
			}

			sortedRoster.push({
				crew_id: crew.id,
				command_skill: crew.command_skill_core * bonus,
				science_skill: crew.science_skill_core * bonus,
				security_skill: crew.security_skill_core * bonus,
				engineering_skill: crew.engineering_skill_core * bonus,
				diplomacy_skill: crew.diplomacy_skill_core * bonus,
				medicine_skill: crew.medicine_skill_core * bonus,
				total: 0
			});
		});

		STTApi.playerData.character.shuttle_adventures.forEach(adventure => {
			let shuttle = adventure.shuttles[0];
			shuttle.challenge_rating = adventure.challenge_rating;

			// TODO: this assumes there are at most 2 skills in each slot
			shuttle.calcSlots = [];
			shuttle.slots.forEach(slot => {
				let calcSlot = {
					bestCrew: JSON.parse(JSON.stringify(sortedRoster)) // Start with a copy
				};
				if (slot.skills.length === 1) {
					// AND or single
					calcSlot.skills = slot.skills[0].split(',');
					if (calcSlot.skills.length === 1) {
						calcSlot.type = 'SINGLE';
						calcSlot.bestCrew.forEach(c => {
							c.total = c[calcSlot.skills[0]];
						});
					} else {
						calcSlot.type = 'AND';
						calcSlot.bestCrew.forEach(c => {
							let a1 = c[calcSlot.skills[0]];
							let a2 = c[calcSlot.skills[1]];
							c.total = Math.floor(
								Math.max(a1, a2) + Math.min(a1, a2) * STTApi.serverConfig.config.shuttle_adventures.secondary_skill_percentage
							);
						});
					}
				} else {
					// OR
					calcSlot.type = 'OR';
					calcSlot.skills = slot.skills;
					calcSlot.bestCrew.forEach(c => {
						c.total = Math.max(c[calcSlot.skills[0]], c[calcSlot.skills[1]]);
					});
				}

				let seen = new Set();
				calcSlot.bestCrew = calcSlot.bestCrew.filter(c => c.total > 0).filter(c => (seen.has(c.crew_id) ? false : seen.add(c.crew_id)));
				calcSlot.bestCrew.sort((a, b) => a.total - b.total);
				calcSlot.bestCrew = calcSlot.bestCrew.reverse();

				calcSlot.bestCrew.forEach(c => {
					c.crew = STTApi.roster.find(cr => cr.id === c.crew_id);
					c.text = `${c.crew.name} (${c.total})`;
					c.value = c.crew.symbol;
					c.image = c.crew.iconUrl;
				});

				calcSlot.selection = calcSlot.bestCrew[0].value;

				// TODO: we could cache the presorted lists since more than one slot will share the same config
				shuttle.calcSlots.push(calcSlot);
			});
		});

		setImmediate(() => this._reconcileCalc());
	}

	_chooseSlot(calcSlot, value) {
		calcSlot.selection = value;

		this._reconcileCalc(calcSlot);
	}

	_reconcileCalc(modified) {
		// A crew can't be part of multiple shuttles

		// TODO: balancing
		let selections = new Set();
		if (modified) {
			selections.add(modified.selection);
		}

		STTApi.playerData.character.shuttle_adventures.forEach(adventure => {
			let shuttle = adventure.shuttles[0];

			shuttle.calcSlots.forEach(calcSlot => {
				if (calcSlot === modified) {
					return;
				}

				calcSlot.selection = undefined;
				for (let bc of calcSlot.bestCrew) {
					if (!selections.has(bc.value)) {
						calcSlot.selection = bc.value;
						selections.add(bc.value);
						break;
					}
				}
			});
		});

		this.setState({ shuttles: STTApi.playerData.character.shuttle_adventures.map(adventure => adventure.shuttles[0]) });
	}

	getState(state) {
		switch (state) {
			case 0:
				return 'Opened';
			case 1:
				return 'In progress';
			case 2:
				return 'Complete';
			case 3:
				return 'Expired';
			default:
				return 'UNKNOWN';
		}
	}

	renderShuttle(shuttle) {
		let faction = STTApi.playerData.character.factions.find(faction => faction.id === shuttle.faction_id);

		return (
			<Item key={shuttle.id}>
				<Item.Image size='small' src={faction.iconUrl} />

				<Item.Content verticalAlign='middle'>
					<Item.Header>
						{shuttle.name} {shuttle.is_rental ? ' (rental)' : ''}
					</Item.Header>
					<Item.Description>
						<p>{shuttle.description}</p>
						<p>Faction: {faction.name}</p>
						<p>Expires in {formatTimeSeconds(shuttle.expires_in)}</p>
						{shuttle.calcSlots.map((calcSlot, idx) => (
							<div key={idx}>
								<b>{calcSlot.skills.map(s => CONFIG.SKILLS[s]).join(` ${calcSlot.type} `)}</b>
								<Dropdown
									fluid
									selection
									options={calcSlot.bestCrew}
									onChange={(e, { value }) => this._chooseSlot(calcSlot, value)}
									value={calcSlot.selection}
								/>
							</div>
						))}
						Chance:{' '}
						{this._shuttleChance(
							shuttle.challenge_rating,
							shuttle.slots.length,
							shuttle.calcSlots.reduce((p, c) => {
								return p + (c.selection ? c.bestCrew.find(cr => cr.value === c.selection).total : 0);
							}, 0)
						)}{' '}
						%
					</Item.Description>
					<Item.Extra>
						State: {this.getState(shuttle.state)}
					</Item.Extra>
				</Item.Content>
			</Item>
		);
	}

	renderEvent() {
		const event = this.state.currentEvent;

		if (!event) {
			return <span />;
		}

		return (
			<div>
				<h2>Current event: {event.name}</h2>
				<Image src={this.state.eventImageUrl} />
				<p>{event.description}</p>
				<h3>Crew bonuses:</h3>
				<List horizontal>
					{event.crew_bonuses.map(cb => (
						<List.Item key={cb.avatar.symbol}>
							<Image avatar src={cb.iconUrl} />
							<List.Content>
								<List.Header>{cb.avatar.name}</List.Header>
								Bonus level {cb.bonus}
							</List.Content>
						</List.Item>
					))}
				</List>
				<h4>Next shuttle VP: {event.nextVP}</h4>
				<h3>Active shuttles</h3>
			</div>
		);
	}

	render() {
		if (!this.state.shuttles) {
			return <p>Calculating...</p>;
		}

		return (
			<div className='tab-panel' data-is-scrollable='true'>
				<div style={{ padding: '10px' }}>
					{this.renderEvent()}
					<Item.Group divided>{this.state.shuttles.map(shuttle => this.renderShuttle(shuttle))}</Item.Group>
				</div>
			</div>
		);
	}
}

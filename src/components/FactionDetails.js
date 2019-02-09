import React from 'react';

import { Accordion, Segment, Header } from 'semantic-ui-react';
import { getTheme } from '@uifabric/styling';

import { ItemDisplay } from './ItemDisplay';

import STTApi from 'sttapi';
import { CONFIG, refreshAllFactions, loadFactionStore } from 'sttapi';

class StoreItem extends React.Component {
	constructor(props) {
		super(props);
	}

	render() {
		let curr = CONFIG.CURRENCIES[this.props.storeItem.offer.cost.currency];
		let locked = this.props.storeItem.locked || this.props.storeItem.offer.purchase_avail === 0;

		let iconUrl;
		if (this.props.storeItem.offer.game_item.type === 1) {
			iconUrl = STTApi.imageProvider.getCrewCached(this.props.storeItem.offer.game_item, false);
		} else {
			iconUrl = STTApi.imageProvider.getCached(this.props.storeItem.offer.game_item);
		}

		return (
			<div style={{ textAlign: 'center' }}>
				<Header as='h5' attached='top' style={{ color: getTheme().palette.neutralDark, backgroundColor: getTheme().palette.themeLighter }}>
					{this.props.storeItem.offer.game_item.name}
				</Header>
				<Segment attached style={{ backgroundColor: getTheme().palette.themeLighter }}>
					<ItemDisplay
						style={{ marginLeft: 'auto', marginRight: 'auto' }}
						src={iconUrl}
						size={80}
						maxRarity={this.props.storeItem.offer.game_item.rarity}
						rarity={this.props.storeItem.offer.game_item.rarity}
					/>
				</Segment>
				<div attached='bottom' style={locked ? { textDecoration: 'line-through' } : {}}>
					<span style={{ display: 'inline-block' }}>
						<img src={CONFIG.SPRITES[curr.icon].url} height={16} />
					</span>
					{this.props.storeItem.offer.cost.amount} {curr.name}
				</div>
			</div>
		);
	}
}

class FactionDisplay extends React.Component {
	constructor(props) {
		super(props);

		let rewardItemIds = new Set();
		const scanRewards = potential_rewards => {
			potential_rewards.forEach(reward => {
				if (reward.potential_rewards) {
					scanRewards(reward.potential_rewards);
				} else if (reward.type === 2) {
					rewardItemIds.add(reward.id);
				}
			});
		};

		scanRewards(this.props.faction.shuttle_mission_rewards);

		let equipment = [];
		rewardItemIds.forEach(itemId => {
			let eq = STTApi.itemArchetypeCache.archetypes.find(equipment => equipment.id === itemId);
			if (eq) {
				equipment.push(eq);
			}
		});

		STTApi.imageProvider
			.getImageUrl(this.props.faction.reputation_item_icon.file, this.props.faction)
			.then(found => {
				this.props.faction.reputationIconUrl = found.url;
				this.setState({ reputationIconUrl: found.url });
			})
			.catch(error => {
				console.warn(error);
			});

		this.state = {
			reputationIconUrl: '',
			showSpinner: true,
			rewards: equipment
		};

		this.refreshStore();
	}

	refreshStore() {
		loadFactionStore(this.props.faction).then(() => {
			this.setState({
				showSpinner: false,
				storeItems: this.props.faction.storeItems
			});
		});
	}

	renderStoreItems() {
		if (this.state.showSpinner) {
			return (
				<div className='centeredVerticalAndHorizontal'>
					<div className='ui centered text active inline loader'>Loading {this.props.faction.name} faction store...</div>
				</div>
			);
		}

		return (
			<div
				style={{ display: 'grid', padding: '10px', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'auto auto', gridGap: '8px' }}>
				{this.state.storeItems.map((storeItem, idx) => (
					<StoreItem key={idx} storeItem={storeItem} />
				))}
			</div>
		);
	}

	_getReputationName(reputation) {
		for (let repBucket of STTApi.platformConfig.config.faction_config.reputation_buckets) {
			if (reputation < repBucket.upper_bound || !repBucket.upper_bound) {
				return repBucket.name;
			}
		}

		return 'Unknown';
	}

	render() {
		let token = STTApi.playerData.character.items.find(item => item.archetype_id === this.props.faction.shuttle_token_id);
		let tokens = token ? token.quantity : 0;

		return (
			<div style={{ paddingBottom: '10px' }}>
				<div style={{ display: 'grid', gridTemplateColumns: 'min-content auto', gridTemplateAreas: `'icon description'`, gridGap: '10px' }}>
					<div style={{ gridArea: 'icon' }}>
						<img src={this.state.reputationIconUrl} height={90} />
					</div>
					<div style={{ gridArea: 'description' }}>
						<h4>{this.props.faction.name}</h4>
						<p>
							Reputation: {this._getReputationName(this.props.faction.reputation)} ({this.props.faction.completed_shuttle_adventures}{' '}
							completed shuttle adventures)
						</p>
						<h4>Transmissions: {tokens}</h4>
					</div>
				</div>
				<Accordion
					defaultActiveIndex={-1}
					panels={[
						{
							key: '1',
							title: 'Potential shuttle rewards',
							content: {
								content: this.state.rewards.map((item, idx) => (
									<span style={{ display: 'contents' }} key={idx}>
										<ItemDisplay
											style={{ display: 'inline-block' }}
											src={item.iconUrl}
											size={24}
											maxRarity={item.rarity}
											rarity={item.rarity}
										/>{' '}
										{item.name}
									</span>
								))
							}
						}
					]}
				/>
				<h5>Store</h5>
				{this.renderStoreItems()}
			</div>
		);
	}
}

export class FactionDetails extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			showSpinner: true
		};

		refreshAllFactions().then(() => {
			this.setState({
				showSpinner: false
			});
		});
	}

	render() {
		if (this.state.showSpinner) {
			return (
				<div className='centeredVerticalAndHorizontal'>
					<div className='ui massive centered text active inline loader'>Loading factions...</div>
				</div>
			);
		}

		return (
			<div className='tab-panel' data-is-scrollable='true'>
				{STTApi.playerData.character.factions.map(faction => (
					<FactionDisplay key={faction.name} faction={faction} />
				))}
			</div>
		);
	}
}

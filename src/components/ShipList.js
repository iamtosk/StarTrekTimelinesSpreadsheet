import React from 'react';
import ReactTable from "react-table";
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Image, ImageFit } from 'office-ui-fabric-react/lib/Image';

import { RarityStars } from './RarityStars';

import STTApi from 'sttapi';

export class ShipList extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			items: STTApi.ships.map(ship => {
				ship.sort_level = ship.level / ship.max_level;
				return ship;
			}),
			sorted: [{ id: 'name', desc: false }, { id:'sort_level'}],
			playerSchematics: STTApi.playerData.character.items.filter(item => item.type === 8),
			columns: [
				{
					id: 'icon',
					Header: '',
					minWidth: 60,
					maxWidth: 60,
					accessor: 'name',
					Cell: (p) => <Image src={p.original.iconUrl} width={48} height={48} imageFit={ImageFit.contain} />
				},
				{
					id: 'name',
					Header: 'Name',
					minWidth: 140,
					maxWidth: 180,
					isSorted: true,
					isSortedDescending: false,
					resizable: true,
					accessor: 'name'
				},
				{
					id: 'level',
					Header: 'Level',
					accessor: 'sort_level',
					minWidth: 145,
					maxWidth: 145,
					resizable: true,
					Cell: (p) => <RarityStars min={1} max={p.original.max_level + 1} value={(p.original.level > 0) ? (p.original.level + 1) : null} />,
					isPadded: true
				},
				{
					id: 'rarity',
					Header: 'Rarity',
					minWidth: 75,
					maxWidth: 75,
					resizable: true,
					accessor: 'rarity',
					Cell: (p) => <RarityStars min={1} max={p.original.rarity} value={p.original.rarity} />,
					isPadded: true
				},
				{
					id: 'schematics',
					Header: 'Schematics',
					minWidth: 50,
					maxWidth: 80,
					resizable: true,
					accessor: ship => this.numberOfSchematics(ship.archetype_id),
					isPadded: true
				},
				{
					id: 'shields',
					Header: 'Shields',
					minWidth: 50,
					maxWidth: 60,
					resizable: true,
					accessor: 'shields'
				},
				{
					id: 'hull',
					Header: 'Hull',
					minWidth: 50,
					maxWidth: 60,
					resizable: true,
					accessor: 'hull'
				},
				{
					id: 'attack',
					Header: 'Attack',
					minWidth: 70,
					maxWidth: 90,
					resizable: true,
					accessor: 'attack',
					Cell: (p) => <span>{p.original.attack} ({p.original.attacks_per_second}/s)</span>
				},
				{
					id: 'accuracy',
					Header: 'Accuracy',
					minWidth: 50,
					maxWidth: 70,
					resizable: true,
					accessor: 'accuracy'
				},
				{
					id: 'evasion',
					Header: 'Evasion',
					minWidth: 50,
					maxWidth: 70,
					resizable: true,
					accessor: 'evasion'
				},
				{
					id: 'antimatter',
					Header: 'Antimatter',
					minWidth: 50,
					maxWidth: 70,
					resizable: true,
					accessor: 'antimatter'
				},
				{
					id: 'traitNames',
					Header: 'Traits',
					minWidth: 80,
					maxWidth: 250,
					resizable: true,
					accessor: 'traitNames',
				},
				{
					id: 'flavor',
					Header: 'Description',
					minWidth: 100,
					resizable: true,
					accessor: 'flavor'
				}
			]
		};
	}

	numberOfSchematics(archetype_id) {
		const schematic = STTApi.shipSchematics.find(schematic => schematic.ship.archetype_id === archetype_id);
		if (!schematic) {
			return 0;
		}

		const playerSchematic = this.state.playerSchematics.find(playerSchematic => playerSchematic.archetype_id === schematic.id);
		return playerSchematic ? playerSchematic.quantity : 0;
	}

	render() {
		let { columns, items, sorted } = this.state;
		const defaultButton = props => <DefaultButton {...props} text={props.children} style={{ width: '100%' }} />;
		return <div className='tab-panel' data-is-scrollable='true'>
			<ReactTable
				data={items}
				columns={columns}
				defaultPageSize={(items.length <= 50) ? items.length : 50}
				pageSize={(items.length <= 50) ? items.length : 50}
				sorted={sorted}
				onSortedChange={sorted => this.setState({ sorted })}
				showPagination={(items.length > 50)}
				showPageSizeOptions={false}
				className="-striped -highlight"
				NextComponent={defaultButton}
				PreviousComponent={defaultButton}
				style={{ height: 'calc(100vh - 56px)' }}
			/>
		</div>;
	}
}
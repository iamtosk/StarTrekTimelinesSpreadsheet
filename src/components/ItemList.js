import React from 'react';
import ReactTable from "react-table";
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';

import { ItemDisplay } from './ItemDisplay';
import { RarityStars } from './RarityStars';
import { CONFIG } from 'sttapi';

export class ItemList extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			items: this.props.data,
			sorted: [{ id: 'name', desc: false }, { id:'rarity'}],
			columns: [
				{
					id: 'icon',
					Header: '',
					minWidth: 50,
					maxWidth: 50,
					resizable: false,
					accessor: 'name',
					Cell: (p) => {
						let item = p.original;
						return (<ItemDisplay src={item.iconUrl} size={50} maxRarity={item.rarity} rarity={item.rarity} />);
					}
				},
				{
					id: 'name',
					Header: 'Name',
					minWidth: 130,
					maxWidth: 180,
					resizable: true,
					accessor: 'name',
					Cell: (p) => {
						let item = p.original;
						return (<a href={'https://stt.wiki/wiki/' + item.name.split(' ').join('_')} target='_blank'>{item.name}</a>);
					}
				},
				{
					id: 'rarity',
					Header: 'Rarity',
					accessor: 'rarity',
					minWidth: 75,
					maxWidth: 75,
					resizable: false,
					Cell: (p) => {
						let item = p.original;
						return (
							<RarityStars
								min={1}
								max={item.rarity}
								value={item.rarity ? item.rarity : null}
							/>
						);
					}
				},
				{
					id: 'quantity',
					Header: 'Quantity',
					minWidth: 50,
					maxWidth: 80,
					resizable: true,
					accessor: 'quantity'
				},
				{
					id: 'type',
					Header: 'Type',
					minWidth: 70,
					maxWidth: 120,
					resizable: true,
					accessor: 'typeName',
					Cell: (p) => {
						let item = p.original;

						let typeName = CONFIG.REWARDS_ITEM_TYPE[item.type];
						if (typeName) {
							return typeName;
						}

						// fall-through case
						typeName = item.icon.file.replace("/items", "").split("/")[1];
						if (typeName) {
							return typeName;
						}

						// show something so we know to fix these
						if (item.item_type) {
							return item.type + "." + item.item_type;
						}
						return item.type;
					}
				},
				{
					id: 'details',
					Header: 'Details',
					minWidth: 150,
					maxWidth: 150,
					resizable: true,
					accessor: 'flavor'
				}
			]
		};
	}

	render() {
		let { columns, items, sorted } = this.state;
		const defaultButton = props => <DefaultButton {...props} text={props.children} style={{ width: '100%' }} />;
		return <div className='data-grid' data-is-scrollable='true'>
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
				style={(items.length > 50) ? { height: 'calc(100vh - 88px)' } : {}}
			/>
		</div>;
	}

	_filterItem(item, searchString) {
		return searchString.split(' ').every(text => {
			// search the name first
			if (item.name.toLowerCase().indexOf(text) > -1) {
				return true;
			}

			// now search the traits
			if (item.symbol && (item.symbol.toLowerCase().indexOf(text) > -1)) {
				return true;
			}

			// now search the raw traits
			if (item.flavor && (item.flavor.toLowerCase().indexOf(text) > -1)) {
				return true;
			}

			return false;
		});
	}

	filter(newValue) {
		this.setState({
			items: newValue ?
				this.props.data.filter(i => this._filterItem(i, newValue.toLowerCase())) :
				this.props.data
		});
	}
}
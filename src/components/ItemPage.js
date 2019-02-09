import React from 'react';
import { SearchBox } from 'office-ui-fabric-react/lib/SearchBox';

import { ItemList } from './ItemList.js';

import { exportItemsCsv } from '../utils/csvExporter.js';

import { download } from '../utils/pal';

import STTApi from 'sttapi';

export class ItemPage extends React.Component {
	constructor(props) {
		super(props);
    }
    
    componentDidMount() {
        this.refs.itemList.filter('');

        if (this.props.onCommandItemsUpdate) {
            this.props.onCommandItemsUpdate([
                {
                    key: 'exportCsv',
                    name: 'Export CSV...',
                    iconProps: { iconName: 'ExcelDocument' },
                    onClick: () => {
                        let csv = exportItemsCsv();
                        download('My Items.csv', csv, 'Export Star Trek Timelines item inventory', 'Export');
                    }
                }
            ]);
        }
    }

	render() {
		return <div>
            <SearchBox placeholder='Search by name or description...'
                onChange={(newValue) => this.refs.itemList.filter(newValue)}
                onSearch={(newValue) => this.refs.itemList.filter(newValue)}
            />
            <ItemList data={STTApi.playerData.character.items} ref='itemList' />
        </div>;
	}
}
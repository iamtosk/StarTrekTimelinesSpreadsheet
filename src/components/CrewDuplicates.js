import React from 'react';

import { CrewList } from './CrewList.js';

import STTApi from 'sttapi';

export class CrewDuplicates extends React.Component {
    constructor(props) {
        super(props);

        this.state = Object.assign({ hideConfirmationDialog: true }, this._loadDuplicates());

        this._loadDuplicates = this._loadDuplicates.bind(this);
    }

    _loadDuplicates() {
        let uniq = STTApi.roster.filter((crew) => !crew.buyback)
            .map((crew) => { return { count: 1, crewId: crew.id }; })
            .reduce((a, b) => {
                a[b.crewId] = (a[b.crewId] || 0) + b.count;
                return a;
            }, {});

        let duplicateIds = Object.keys(uniq).filter((a) => uniq[a] > 1);

        let duplicates = STTApi.roster.filter((crew) => duplicateIds.includes(crew.id.toString()));

        let selectedIds = new Set();
        duplicates.forEach(crew => {
            if ((crew.level === 1) && (crew.rarity === 1)) {
                // TODO: only if player already has it FFFE
                selectedIds.add(crew.crew_id);
            }
        });

        return {duplicates, selectedIds};
    }

    render() {
        if (this.state.duplicates.length > 0) {
            return (<div className='tab-panel' data-is-scrollable='true'>
                <CrewList data={this.state.duplicates} duplicatelist={true} sortColumn='name' embedded={true} />
            </div>);
        }
        else {
            return <span />;
        }
    }
}
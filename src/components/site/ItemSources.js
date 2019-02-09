import React from 'react'

import { CONFIG } from 'sttapi';
import { getMissionCost } from './utils';

export class ItemSources extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let disputeMissions = this.props.equipment.item_sources.filter(e => e.type === 0);
        let shipBattles = this.props.equipment.item_sources.filter(e => e.type === 2);
        let factions = this.props.equipment.item_sources.filter(e => e.type === 1);

        let res = [];
        if (disputeMissions.length > 0) {
            res.push(<p key={'disputeMissions'}>
                <b>Missions: </b>
                {disputeMissions.map((entry, idx) =>
                    <span key={idx}>{entry.name}
                        <span style={{ display: 'inline-block' }}><img src={CONFIG.MASTERY_LEVELS[entry.mastery].url()} height={14} /></span>
                        ({entry.chance_grade}/5 <span style={{ display: 'inline-block' }}><img src={CONFIG.SPRITES['energy_icon'].url} height={14} /></span> {getMissionCost(entry.id, entry.mastery)})
                    </span>
                ).reduce((prev, curr) => [prev, ', ', curr])}
            </p>)
        }

        if (shipBattles.length > 0) {
            res.push(<p key={'shipBattles'}>
                <b>Ship battles: </b>
                {shipBattles.map((entry, idx) =>
                    <span key={idx}>{entry.name}
                        <span style={{ display: 'inline-block' }}><img src={CONFIG.MASTERY_LEVELS[entry.mastery].url()} height={14} /></span>
                        ({entry.chance_grade}/5 <span style={{ display: 'inline-block' }}><img src={CONFIG.SPRITES['energy_icon'].url} height={14} /></span> {getMissionCost(entry.id, entry.mastery)})
                    </span>
                ).reduce((prev, curr) => [prev, ', ', curr])}
            </p>)
        }

        if (factions.length > 0) {
            res.push(<p key={'factions'}>
                <b>Faction missions: </b>
                {factions.map((entry, idx) =>
                    `${entry.name} (${entry.chance_grade}/5)`
                ).join(', ')}
            </p>)
        }

        return res;
    }
}
import React from 'react'
import { Header, Popup, Modal, Grid, Icon } from 'semantic-ui-react'

import { ItemDisplay } from './ItemDisplay';
import { ItemSources } from './ItemSources';

import STTTools from './api';
import { CONFIG } from 'sttapi';
import { parseRecipeDemands, estimateChronitonCost } from './utils';

export class CrewFullEquipTree extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            modalOpen: false,
            crew: undefined
        };
    }

    handleOpen(crew) {
        let recipeTree = {
            incomplete: false,
            craftCost: 0,
            list: {}
        };

        crew.equipment_slots.forEach(es => {
            let equip = crew.archetypes.find(eq => eq.id === es.archetype);
            let equipment = STTTools.archetypeCache.find(a => a.symbol === equip.symbol);

            parseRecipeDemands(recipeTree, equipment.id, 1);
        })


        this.setState({ modalOpen: true, recipeTree, crew });
    }

    handleClose() {
        this.setState({ modalOpen: false, crew: undefined });
    }

    render() {
        const { crew } = this.state;

        if (!crew) {
            return <span />;
        }

        let demands = [];
        for (let equipment_id in this.state.recipeTree.list) {
            demands.push(this.state.recipeTree.list[equipment_id]);
        }

        const reducer = (accumulator, currentValue) => accumulator + currentValue.count;
        let factionOnlyTotal = demands.filter(d => d.factionOnly).reduce(reducer, 0);

        let totalChronCost = Math.floor(demands.reduce((a, c) => a + estimateChronitonCost(c.equipment), 0));

        return <Modal
            open={this.state.modalOpen}
            onClose={() => this.handleClose()}
        >
            <Modal.Header>{crew.name}'s expanded equipment recipe trees</Modal.Header>
            <Modal.Content scrolling>
                <p>Faction-only items required <b>{factionOnlyTotal}</b></p>
                <p>Estimated chroniton cost <span style={{ display: 'inline-block' }}><img src={CONFIG.SPRITES['energy_icon'].url} height={14} /></span> <b>{totalChronCost}</b>
                    <Popup wide
                        trigger={<Icon fitted name='help' />}
                        header={'How is this calculated?'}
                        content={<div>
                            <p>This sums the estimated chroniton cost of each equipment and component in the tree.</p>
                            <p>It estimates an item's cost by running the formula below for each mission and choosing the cheapest:</p>
                            <p><code>(6 - PIPS) * 1.8 * <i>mission cost</i></code></p>
                            <p>See code for details. Feedback is welcome!</p>
                        </div>}
                    />
                </p>
                <p>Build cost <span style={{ display: 'inline-block' }}><img src={CONFIG.SPRITES['images_currency_sc_currency_0'].url} height={16} /></span> <b>{this.state.recipeTree.craftCost}</b></p>
                <Grid columns={3} centered padded>
                    {demands.map(entry =>
                        <Grid.Column key={entry.equipment.id}>
                            <Popup
                                trigger={<Header style={{ display: 'flex', cursor: 'zoom-in' }}
                                    icon={<ItemDisplay src={STTTools.assetProvider.getCached(entry.equipment)} size={48} maxRarity={entry.equipment.rarity} rarity={entry.equipment.rarity} />}
                                    content={entry.equipment.name}
                                    subheader={`Need ${entry.count} ${entry.factionOnly ? ' (FACTION)' : ''}`} />}
                                header={CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
                                content={<ItemSources equipment={entry.equipment} />}
                                on='click'
                                wide
                            />
                        </Grid.Column>
                    )}
                </Grid>
            </Modal.Content>
        </Modal>;
    }
}
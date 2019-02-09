import React from 'react';
import { Dropdown, Header, Image, Modal, Rating, Label, Grid, Popup, Divider, Button } from 'semantic-ui-react';

import { ItemDisplay } from './ItemDisplay';
import { ItemSources } from './ItemSources';
import { CrewFullEquipTree } from './CrewFullEquipTree';

import STTApi from 'sttapi';
import STTTools from './api';
import { CONFIG } from 'sttapi';
import { parseRecipeDemands } from './utils';

export class ModalCrewDetails extends React.Component {
    constructor(props) {
        super(props);

        this.crewFullEquipTree = React.createRef();

        this.state = {
            modalOpen: false,
            crew: undefined
        };
    }

    handleOpen(crew) {
        let collections = [];
        STTTools.cryoCollectionsCache.forEach(col => {
            if ((crew.traits.concat(crew.traits_hidden).filter(trait => col.traits.includes(trait)).length > 0) || (col.extra_crew.includes(crew.id))) {
                collections.push(col);
            }
        });

        this.setState({ modalOpen: true, recipeTree: undefined, crew, collections, iconUrl: undefined });

        STTApi.imageProvider.getCrewImageUrl(crew, true).then(({ id, url }) => {
            this.setState({ iconUrl: url });
        }).catch((error) => { this.setState({ iconUrl: '' }); });
    }

    handleClose() {
        this.setState({ modalOpen: false, crew: undefined, iconUrl: undefined });
    }

    renderItemStat(crew, skill) {
        if (!crew.skills[skill]) {
            return <span />;
        }

        return <div style={{ display: 'grid', gridTemplateColumns: '60px auto', gridTemplateAreas: `'icon stats' 'icon description'`, gridGap: '4px', paddingTop: '5px' }}>
            <div style={{ gridArea: 'icon' }}>
                <img src={CONFIG.SPRITES['icon_' + skill].url} height={44} />
            </div>
            <div style={{ gridArea: 'stats' }}>
                <span style={{ fontWeight: '900', fontSize: '1.5em' }}>{crew.skills[skill].core}</span> +({crew.skills[skill].range_min}-{crew.skills[skill].range_max})
            </div>
            <div style={{ gridArea: 'description' }}>
                {CONFIG.SKILLS[skill].name}
            </div>
        </div>;
    }

    render() {
        const { crew } = this.state;

        if (!crew) {
            return <span />;
        }

        return <div>
            <CrewFullEquipTree ref={this.crewFullEquipTree} />
            <Modal
                open={this.state.modalOpen}
                onClose={() => this.handleClose()}
            >
                <Modal.Header>{crew.name} <Rating defaultRating={crew.max_rarity} maxRating={5} icon='star' size='large' disabled />
                    <Button.Group floated='right'>
                        <Button compact onClick={() => window.open('http://memory-alpha.wikia.com/wiki/' + crew.short_name.split(' ').join('_'), '_blank')} >Memory Alpha</Button>
                        <Button compact onClick={() => window.open('https://stt.wiki/wiki/' + crew.name.split(' ').join('_'), '_blank')} >STT Wiki</Button>
                    </Button.Group>
                </Modal.Header>
                <Modal.Content image scrolling>
                    <Image size='medium' src={this.state.iconUrl} />
                    <Modal.Description>
                        {crew.flavor && <p>{crew.flavor}</p>}

                        <Divider horizontal>Base stats</Divider>
                        <div>
                            {this.renderItemStat(crew, 'command_skill')}
                            {this.renderItemStat(crew, 'diplomacy_skill')}
                            {this.renderItemStat(crew, 'engineering_skill')}
                            {this.renderItemStat(crew, 'medicine_skill')}
                            {this.renderItemStat(crew, 'science_skill')}
                            {this.renderItemStat(crew, 'security_skill')}
                        </div>

                        <p><b>Traits: </b>{crew.traits_named.join(', ')}<span style={{ color: 'lightgray' }}>, {crew.traits_hidden.join(', ')}</span></p>

                        {(this.state.collections.length > 0) && <p><b>Collections: </b>{this.state.collections.map(c => c.name).join(', ')}</p>}

                        <Button onClick={() => this.crewFullEquipTree.current.handleOpen(crew)} content='Full tree' style={{ marginTop: '-0.5rem' }} color='olive' floated='right' compact size='tiny' icon='right arrow' labelPosition='right' />
                        <Divider horizontal>Equipment</Divider>
                        {this.renderEquipment(crew)}
                        {this.renderEquipmentDetails()}

                        <Divider horizontal>Ship abilitiy</Divider>

                        <h4>{crew.action.name}</h4>
                        <p>Boosts {CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.bonus_type]} by {crew.action.bonus_amount}</p>
                        <p>Initialize: {crew.action.initial_cooldown}s   Cooldown: {crew.action.cooldown}s   Duration: {crew.action.duration}s</p>
                        {crew.action.limit && <p>Uses Per Battle: {crew.action.limit}</p>}

                        {crew.action.ability &&
                            <p>Bonus ability:
                            {CONFIG.CREW_SHIP_BATTLE_ABILITY_TYPE[crew.action.ability.type].replace('%VAL%', crew.action.ability.amount)} {(crew.action.ability.condition > 0) && <span>Trigger: {CONFIG.CREW_SHIP_BATTLE_TRIGGER[crew.action.ability.condition]}</span>}
                            </p>}

                        <p>Accuracy +{crew.ship_battle.accuracy}  Crit Bonus +{crew.ship_battle.crit_bonus}  {crew.ship_battle.crit_chance && <span>Crit Rating +{crew.ship_battle.crit_chance}  </span>}Evasion +{crew.ship_battle.evasion}</p>
                        {crew.action.penalty && <p>Decrease {CONFIG.CREW_SHIP_BATTLE_BONUS_TYPE[crew.action.penalty.type]} by {crew.action.penalty.amount}</p>}

                        {this.renderChargePhases(crew.action.charge_phases)}
                    </Modal.Description>
                </Modal.Content>
            </Modal>
        </div>;
    }

    renderEquipment(crew) {
        let options = [];
        crew.equipment_slots.forEach(es => {
            let equip = crew.archetypes.find(eq => eq.id === es.archetype);
            let equipment = STTTools.archetypeCache.find(a => a.symbol === equip.symbol);

            options.push({
                key: es.archetype + '_' + es.level,
                text: `${equipment.name} (level ${es.level})`,
                value: es.archetype,
                content: <Header icon={<ItemDisplay src={STTTools.assetProvider.getCached(equipment)} size={48} maxRarity={equipment.rarity} rarity={equipment.rarity} />} content={equipment.name} subheader={`Level ${es.level}`} />
            });
        });

        return <Dropdown selection fluid options={options} placeholder='Choose an equipment to see its details' onChange={(ev, { value }) => this._equipmentSelect(crew, value)} />;
    }

    _equipmentSelect(crew, value) {
        let equip = crew.archetypes.find(eq => eq.id === value);
        let equipment = STTTools.archetypeCache.find(a => a.symbol === equip.symbol);

        let recipeTree = {
            incomplete: false,
            craftCost: 0,
            list: {}
        };

        parseRecipeDemands(recipeTree, equipment.id, 1);

        this.setState({ recipeTree });
    }

    renderEquipmentDetails() {
        if (!this.state.recipeTree) {
            return <span />;
        }

        let demands = [];
        for (let equipment_id in this.state.recipeTree.list) {
            demands.push(this.state.recipeTree.list[equipment_id]);
        }

        return <div>
            <Grid columns={4} centered padded>
                {demands.map(entry => <Grid.Column key={entry.equipment.id} textAlign='center'>
                    <Popup
                        trigger={<Label as='a' style={{ background: CONFIG.RARITIES[entry.equipment.rarity].color }} image size='big'>
                            <img src={STTTools.assetProvider.getCached(entry.equipment)} />
                            x{entry.count}
                        </Label>}
                        header={CONFIG.RARITIES[entry.equipment.rarity].name + ' ' + entry.equipment.name}
                        content={<ItemSources equipment={entry.equipment} />}
                        wide
                    />
                </Grid.Column>)}
            </Grid>
        </div>;
    }

    renderChargePhases(charge_phases) {
        if (!charge_phases) {
            return <span />;
        } else {
            let phases = [];
            charge_phases.forEach((cp, idx) => {
                let phaseDescription = `Charge time: ${cp.charge_time}s`;

                if (cp.ability_amount) {
                    phaseDescription += `  Ability amount: ${cp.ability_amount}`;
                }

                if (cp.bonus_amount) {
                    phaseDescription += `  Bonus amount: ${cp.bonus_amount}`;
                }

                if (cp.duration) {
                    phaseDescription += `  Duration: ${cp.duration}s`;
                }

                if (cp.cooldown) {
                    phaseDescription += `  Cooldown: ${cp.cooldown}s`;
                }

                phases.push(<p key={idx}>{phaseDescription}</p>);
            });

            return (<div>
                <h4>Charge phases</h4>
                <div>
                    {phases}
                </div>
            </div>);
        }
    }
}
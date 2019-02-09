import React from 'react';

import { Dialog, DialogType } from 'office-ui-fabric-react/lib/Dialog';

import { CollapsibleSection } from './CollapsibleSection.js';
import UserStore from './Styles';

import STTApi from 'sttapi';
import { CONFIG, loadVoyage, formatTimeSeconds } from 'sttapi';

export class ShuttleAdventure extends React.Component {
    constructor(props) {
        super(props);

        STTApi.playerData.character.shuttle_adventures.forEach((shuttle) => {
            if (shuttle.shuttles[0].id === props.activeId) {
                this.state = {
                    name: shuttle.shuttles[0].name,
                    description: shuttle.shuttles[0].description,
                    completes_in_seconds: shuttle.shuttles[0].expires_in,
                    challenge_rating: shuttle.challenge_rating,
                    faction: STTApi.playerData.character.factions.find((faction) => faction.id === shuttle.faction_id)
                };
            }
        });
    }

    render() {
        return (<div>
            <table>
                <tbody>
                    <tr>
                        <td style={{ width: '150px' }} >
                            <img src={CONFIG.SPRITES['icon_shuttle_lg'].url} />
                        </td>
                        <td style={{ verticalAlign: 'center' }} >
                            <h3>{this.state.name}</h3>
                        </td>
                        <td>
                            <img src={this.state.faction.iconUrl} style={{ height: '80px' }} />
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={3}>
                            <h4>{this.state.description}</h4>
                        </td>
                    </tr>
                </tbody>
            </table>
            <p>Completes in {formatTimeSeconds(this.state.completes_in_seconds)}.</p>
            <p>Faction: {this.state.faction.name} ({this.state.faction.completed_shuttle_adventures} completed adventures)</p>
            <p>Challenge rating: {this.state.challenge_rating}.</p>
        </div>);
    }
}

export class VoyageLogEntry extends React.Component {
	constructor(props) {
        super(props);
        
        this.props.log.forEach(entry=> {
            // TODO: some log entries have 2 crew 
            if (entry.crew) {
                let rc = STTApi.roster.find((rosterCrew) => rosterCrew.symbol == entry.crew[0]);
                if (rc) entry.crewIconUrl = rc.iconUrl;
            }
        });
	}

	render() {
		return (<ul>
            {this.props.log.map((entry, index) =>
                <li key={index}>
                    <span className='quest-mastery'>
                        {entry.skill_check && (
                            <span className='quest-mastery'>
                                <img src={CONFIG.SPRITES['icon_' + entry.skill_check.skill].url} height={18} />
                                <i className={`thumbs ${entry.skill_check.passed ? 'up' : 'down'} outline icon`}></i>
                                &nbsp;
                            </span>
                        )}
                        {entry.crewIconUrl && (
                            <img src={entry.crewIconUrl} height={32} />
                        )}
                        <span dangerouslySetInnerHTML={{__html: entry.text}} />
                    </span>
                </li>
            )}
		</ul>);
	}
}

export class Voyage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showSpinner: true
        }

        STTApi.playerData.character.voyage.forEach((voyage) => {
            if (voyage.id == props.activeId) {
                loadVoyage(voyage.id, false).then((voyageNarrative) => {

                    // Group by index
                    voyageNarrative = voyageNarrative.reduce(function (r, a) {
                        r[a.index] = r[a.index] || [];
                        r[a.index].push(a);
                        return r;
                    }, Object.create(null));

                    this.setState({
                        showSpinner: false,
                        ship_name: voyage.ship_name,
                        ship_id: voyage.ship_id,
                        created_at: voyage.created_at,
                        voyage_duration: voyage.voyage_duration,
                        seconds_since_last_dilemma: voyage.seconds_since_last_dilemma,
                        seconds_between_dilemmas: voyage.seconds_between_dilemmas,
                        skill_aggregates: voyage.skill_aggregates,
                        crew_slots: voyage.crew_slots,
                        voyage: voyage,
                        voyageNarrative: voyageNarrative
                    });
                });
            }
        });
    }

    renderVoyageState() {
        if (this.state.voyage.state == "recalled") {
            return <p>Voyage has lasted for {formatTimeSeconds(this.state.voyage_duration)} and it's currently returning.</p>;
        } else if (this.state.voyage.state == "failed") {
            return <p>Voyage has run out of antimatter after {formatTimeSeconds(this.state.voyage_duration)} and it's waiting to be abandoned or replenished.</p>;
        } else {
            return <p>Voyage has been ongoing for {formatTimeSeconds(this.state.voyage_duration)} (new dilemma in {formatTimeSeconds(this.state.seconds_between_dilemmas - this.state.seconds_since_last_dilemma)}).</p>;
        }
    }

    render() {
        if (this.state.showSpinner) {
			return <div className="ui big centered text active inline loader">Loading voyage details...</div>;
		}

        return (<div style={{ userSelect: 'initial' }}>
            <h3>Voyage on the {STTApi.getShipTraitName(this.state.voyage.ship_trait)} ship {this.state.ship_name}</h3>
            {this.renderVoyageState()}
            <p>Antimatter remaining: {this.state.voyage.hp} / {this.state.voyage.max_hp}.</p>
            <table style={{ borderSpacing: '0' }}>
                <tbody>
                    <tr>
                        <td>
                            <section>
                                <h4>Full crew complement and skill aggregates</h4>
                                <ul>
                                    {this.state.crew_slots.map((slot) => {
                                        return (<li key={slot.symbol}><span className='quest-mastery'>
                                            {slot.name} &nbsp; <img src={ STTApi.roster.find((rosterCrew) => rosterCrew.id == slot.crew.archetype_id).iconUrl} height={20} /> &nbsp; {slot.crew.name}
                                            </span>
                                        </li>);
                                    })}
                                </ul>
                            </section>
                        </td>
                        <td>
                            <ul>
                                {Object.values(this.state.voyage.skill_aggregates).map((skill) => {
                                    return (<li key={skill.skill}>
                                        <span className='quest-mastery'>
                                            <img src={CONFIG.SPRITES['icon_' + skill.skill].url} height={18} /> &nbsp; {skill.core} ({skill.range_min}-{skill.range_max})
                                        </span>
                                    </li>);
                                })}
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
            <CollapsibleSection title={'Pending rewards (' + this.state.voyage.pending_rewards.loot.length + ')'} background='#0078d7'>
                {this.state.voyage.pending_rewards.loot.map((loot, index) => {
                    return (<span key={index} style={{ color: loot.rarity && CONFIG.RARITIES[loot.rarity].color }}>{loot.quantity} {(loot.rarity == null) ? '' : CONFIG.RARITIES[loot.rarity].name} {loot.full_name}</span>);
                }).reduce((prev, curr) => [prev, ', ', curr])}
            </CollapsibleSection>
            <CollapsibleSection title={'Complete Captain\'s Log (' + Object.keys(this.state.voyageNarrative).length + ')'} background='#0078d7'>
                {Object.keys(this.state.voyageNarrative).map((key) => {
                    return <VoyageLogEntry key={key} log={this.state.voyageNarrative[key]}/>;
                })}
            </CollapsibleSection>
        </div>);
    }
}

export class ActiveCrewDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hideDialog: true,
            shuttle: true, // false if voyage,
            title: 'Active crew status',
            activeId: null
        };

        this._cancelDialog = this._cancelDialog.bind(this);
    }

    render() {
        let currentTheme = UserStore.get('theme');

        return <Dialog
                    hidden={this.state.hideDialog}
                    title={this.state.title}
                    onDismiss={this._cancelDialog}
                    dialogContentProps={{ type: DialogType.largeHeader }}
                    modalProps={{
                        isBlocking: false,
                        containerClassName: 'activedialogMainOverride'
                    }}
                >
                <div style={{ color: currentTheme.semanticColors.bodyText, backgroundColor: currentTheme.semanticColors.bodyBackground }}>
                    {this.state.shuttle && (
                        <ShuttleAdventure activeId={this.state.activeId} />
                    )}

                    {!this.state.shuttle && (
                        <Voyage activeId={this.state.activeId} />
                    )}
                </div>
            </Dialog>;
    }

    show(active_id, name) {
        let shuttle = STTApi.playerData.character.shuttle_adventures.find((shuttle) => shuttle.shuttles[0].id == active_id);
        this.setState({
            hideDialog: false,
            activeId: active_id,
            shuttle: shuttle,
            title: name + (shuttle ? ' is on a shuttle adventure' : ' is on a voyage')
        });
    }

    _cancelDialog() {
        this.setState({ hideDialog: true });
    }
}
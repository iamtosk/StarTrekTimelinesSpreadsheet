import React from 'react';
import { Image } from 'office-ui-fabric-react/lib/Image';
import { Dropdown, DropdownMenuItemType } from 'office-ui-fabric-react/lib/Dropdown';
import { Persona, PersonaSize, PersonaPresence } from 'office-ui-fabric-react/lib/Persona';

import { getTheme } from '@uifabric/styling';

import { MissionDisplay } from '../utils/canvasutils';

import STTApi from 'sttapi';
import { CONFIG, calculateQuestRecommendations } from 'sttapi';

export class MissionDetails extends React.Component {
    constructor(props) {
        super(props);

        this.loadMissionDetails = this.loadMissionDetails.bind(this);
        this.loadMissionDetailsInternal = this.loadMissionDetailsInternal.bind(this);
        this.updateGraph = this.updateGraph.bind(this);
        this.missionDisplay = undefined;

        if (!this.props.questId) {
            this.state = {
                mission: undefined,
                selectedChallenge: undefined,
                bestCrewPaths: undefined,
                allFinished: false
            };
        }
        else {
            this.state = this.loadMissionDetailsInternal(this.props.questId.data.questId);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.mission !== prevState.mission) {
            this.updateGraph();
        }
    }

    loadMissionDetails(questId) {
        this.setState(this.loadMissionDetailsInternal(questId));
    }

    loadMissionDetailsInternal(questId) {
        return calculateQuestRecommendations(questId, false);
    }

    updateGraph() {
        if (!this.refs.canvasMission)
            return;

        let mission = this.state.mission;
        if (mission) {
            let maxX = 1;
            let maxY = 1;
            mission.challenges.forEach(challenge => {
                maxX = Math.max(challenge.grid_x, maxX);
                maxY = Math.max(challenge.grid_y, maxY);
            });

            maxX++; maxY++;

            if (this.missionDisplay) {
                this.missionDisplay.reset(maxX, maxY);
            } else {
                this.missionDisplay = new MissionDisplay(this.refs.canvasMission, maxX, maxY, (id) => this.setState({ selectedChallenge: id }) );
            }

            let nodes = [];
            let edges = [];
            mission.challenges.forEach(challenge => {
                let color = getTheme().palette.themeDark;
                if (challenge.critical) {
                    if (!challenge.critical.claimed) {
                        color = 'red';
                    }
                }

                nodes.push({ id: challenge.id, label: '(' + challenge.id + ') ' + challenge.name, level: challenge.grid_x, image: CONFIG.SPRITES['icon_' + challenge.skill].url, shape: 'image', font: { color: color } });
                if (challenge.children) {
                    challenge.children.forEach(child => {
                        edges.push({ from: challenge.id, to: child });
                    });
                }

                if (this.missionDisplay) {
                    this.missionDisplay.addNode(challenge.grid_x, challenge.grid_y, challenge.skill, challenge.critical && !challenge.critical.claimed, challenge.children, challenge.id, challenge.name);
                }
            });
        }
    }

    renderChallengeDetails() {
        let challenge = undefined;
        let mission = this.state.mission;
        if (mission) {
            mission.challenges.forEach(item => {
                if (item.id == this.state.selectedChallenge) {
                    challenge = item;
                }
            });
        }

        if (!challenge) {
            return <span />;
        }

        var traitBonuses = [];
        challenge.trait_bonuses.map((traitBonus) => {
            traitBonuses.push(<span key={traitBonus.trait}>{STTApi.getTraitName(traitBonus.trait)}</span>);
        });

        var lockTraits = [];
        challenge.locks.map((lock) => {
            if (lock.trait) {
                lockTraits.push(<span key={lock.trait}>{STTApi.getTraitName(lock.trait)}</span>);
            }
            else {
                lockTraits.push(<span key={lock.success_on_node_id}>Success on {mission.challenges.find(item => item.id == lock.success_on_node_id).name}</span>);
            }
        });

        let critical = <span />;
        if (challenge.critical) {
            if (!challenge.critical.claimed) {
                critical = <p>Critical reward: {challenge.critical.reward[0].full_name}</p>;
            }
        }

        let recommendations = STTApi.missionSuccess.find(missionSuccess => (missionSuccess.quest.id == mission.id) && (missionSuccess.challenge.id == challenge.id));
        let crewSuccess = [];
        recommendations.crew.forEach(item => {
            crewSuccess.push(<Persona
                key={item.crew.name}
                imageUrl={item.crew.iconUrl}
                text={item.crew.name}
                secondaryText={item.success.toFixed(2) + '%'}
                showSecondaryText={true}
                size={PersonaSize.small}
                presence={(item.success >= 99.9) ? PersonaPresence.online : ((item.success > 50) ? PersonaPresence.away : PersonaPresence.busy)} />);
        });

        return (<div>
            <h4>{challenge.name}</h4>
            <span className='quest-mastery'>
                Skill: <Image src={CONFIG.SPRITES['icon_' + challenge.skill].url} height={18} /> {CONFIG.SKILLS[challenge.skill]}
            </span>
            <p>Trait bonuses: {(traitBonuses.length > 0) ? traitBonuses.reduce((prev, curr) => [prev, ', ', curr]) : 'none'}</p>
            <p>Locks: {(lockTraits.length > 0) ? lockTraits.reduce((prev, curr) => [prev, ', ', curr]) : 'none'}</p>
            {critical}
            <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                {crewSuccess}
            </div>
            {(recommendations.crew.length == 0) && <span style={{ color: 'red' }}>You have no crew capable of completing this node!</span>}
        </div>);
    }

    htmlDecode(input) {
        input = input.replace(/<#([0-9A-F]{6})>/gi, '<span style="color:#$1">');
        input = input.replace(/<\/color>/g, '</span>');

        return {
            __html: input
        };
    }

    render() {
        if (!this.state.mission) {
            return <span />;
        }

        var crewSelectionLog;
        if (this.state.bestCrewPaths.length == 0) {
            if (this.state.allFinished) {
                crewSelectionLog = <span>You already completed all nodes on this mission. Congrats!</span>;
            } else {
                crewSelectionLog = <span style={{ color: 'red' }}>There is no crew selection capable of completing this mission. Get more crew!</span>;
            }
        }
        else {
            crewSelectionLog = [];
            this.state.bestCrewPaths.forEach((crewpath, indexcrewpath) => {
                let crewSuccess = [];
                crewpath.crew.forEach((crewpathcrew, index) => {
                    crewSuccess.push(<Persona
                        key={crewpathcrew.crew.name + index}
                        imageUrl={crewpathcrew.crew.iconUrl}
                        text={'(' + crewpath.path[index] + ') ' + crewpathcrew.crew.name}
                        size={PersonaSize.extraExtraSmall}
                        presence={PersonaPresence.none} />);
                });

                crewSelectionLog.push(
                    <div key={indexcrewpath} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                        <span>{(crewpath.success).toFixed(2)}% guaranteed success:</span>
                        {crewSuccess}
                    </div>
                );
            });
        }

        return (<div>
            <table style={{ width: '100%' }}>
                <tbody>
                    <tr style={{ minWidth: '300px' }}><td style={{ width: '50%' }}>
                        <h3>{this.state.mission.name}</h3>
                        <p>{this.state.mission.description}</p>

                        <div>
                            Mastery required: <span className='quest-mastery'>
                                <Image src={CONFIG.MASTERY_LEVELS[0].url()} height={20} />({this.state.mission.difficulty_by_mastery[0]})
                            <Image src={CONFIG.MASTERY_LEVELS[1].url()} height={20} />({this.state.mission.difficulty_by_mastery[1]})
                            <Image src={CONFIG.MASTERY_LEVELS[2].url()} height={20} />({this.state.mission.difficulty_by_mastery[2]})
                        </span>
                        </div>
                        <div>
                            Completed: <span className='quest-mastery'>
                                <Image src={CONFIG.MASTERY_LEVELS[0].url()} height={20} />({this.state.mission.mastery_levels[0].progress.goal_progress} / {this.state.mission.mastery_levels[0].progress.goals})
                            <Image src={CONFIG.MASTERY_LEVELS[1].url()} height={20} />({this.state.mission.mastery_levels[1].progress.goal_progress} / {this.state.mission.mastery_levels[1].progress.goals})
                            <Image src={CONFIG.MASTERY_LEVELS[2].url()} height={20} />({this.state.mission.mastery_levels[2].progress.goal_progress} / {this.state.mission.mastery_levels[2].progress.goals})
                        </span>
                        </div>
                        <div>
                            Trait bonuses: <span className='quest-mastery'>
                                <Image src={CONFIG.MASTERY_LEVELS[0].url()} height={20} />({this.state.mission.trait_bonuses[0]})
                            <Image src={CONFIG.MASTERY_LEVELS[1].url()} height={20} />({this.state.mission.trait_bonuses[1]})
                            <Image src={CONFIG.MASTERY_LEVELS[2].url()} height={20} />({this.state.mission.trait_bonuses[2]})
                        </span>
                        </div>
                        <div>
                            Critical threshold: {this.state.mission.critical_threshold ? this.state.mission.critical_threshold : 'none'}
                        </div>
                        {this.state.mission.cadet && (
                            <div>
                                Cadet requirements: <span dangerouslySetInnerHTML={this.htmlDecode(this.state.mission.crew_requirement.description)} />
                            </div>
                        )}
                    </td><td style={{ width: '50%', minHeight: '280px' }}>
                            <canvas ref='canvasMission' width={1000} height={450} style={{ width: '100%', height: 'auto' }} />
                        </td></tr>
                    <tr><td colSpan={2}>
                        {crewSelectionLog}
                        {(this.state.selectedChallenge != undefined) && this.renderChallengeDetails()}
                    </td>
                    </tr>
                </tbody>
            </table>
        </div>);
    }
}

export class MissionExplorer extends React.Component {
    constructor(props) {
        super(props);

        this.loadOptions = this.loadOptions.bind(this);

        this.state = {
            dataAvailable: true,
            selectedItem: null,
            onlyIncomplete: false,
            options: this.loadOptions(false)
        };
    }

    componentDidMount() {
        this._updateCommandItems();
    }

    _updateCommandItems() {
        if (this.props.onCommandItemsUpdate) {
            this.props.onCommandItemsUpdate([{
                key: 'settings',
                text: 'Settings',
                iconProps: { iconName: 'Equalizer' },
                subMenuProps: {
                    items: [{
                        key: 'onlyIncomplete',
                        text: 'Show only unfinished missions',
                        canCheck: true,
                        isChecked: this.state.onlyIncomplete,
                        onClick: () => {
                            let isChecked = !this.state.onlyIncomplete;
                            this.setState({
                                options: this.loadOptions(isChecked),
                                onlyIncomplete: isChecked
                            }, () => { this._updateCommandItems(); });
                        }
                    }]
                }
            }]);
        }
    }

    loadOptions(onlyIncomplete) {
        let options = [];
        STTApi.missions.forEach(function (mission) {
            if (mission.quests.length == 0) return;
            if (onlyIncomplete && (mission.stars_earned == mission.total_stars)) return;

            var missionLabel = (mission.quests[0].cadet ? 'CADET - ' : '') + mission.episode_title;
            missionLabel += ' (' + mission.stars_earned + ' / ' + mission.total_stars + ')';

            options.push({ key: mission.episode_title + mission.id, text: missionLabel, itemType: DropdownMenuItemType.Header });
            var any = false;
            mission.quests.forEach(function (quest) {
                if (quest.quest_type == 'ConflictQuest') {
                    if (onlyIncomplete) {
                        let goals = quest.mastery_levels[0].progress.goals + quest.mastery_levels[1].progress.goals + quest.mastery_levels[2].progress.goals;
                        let goal_progress = quest.mastery_levels[0].progress.goal_progress + quest.mastery_levels[1].progress.goal_progress + quest.mastery_levels[2].progress.goal_progress;
                        if (goals == goal_progress) return;
                    }

                    options.push({ key: quest.name + quest.id, text: quest.name, data: { mission: mission.episode_title, questId: quest.id } });
                    any = true;
                }
            });

            if (!any) {
                options.pop();
            }
        });

        return options;
    }

    _onRenderTitle(options) {
        let option = options[0];
        return (<div>
            <span><b>{option.data.mission} : </b></span>
            <span>{option.text}</span>
        </div>);
    }

    render() {
        if (this.state.dataAvailable)
            return (
                <div className='tab-panel' data-is-scrollable='true'>
                    <p><b>Note: </b>These calculations only search crew necessary for completing the missions with the epic mastery.</p>
                    <Dropdown
                        selectedKey={this.state.selectedItem && this.state.selectedItem.key}
                        onChange={(evt, item) => { this.setState({ selectedItem: item }); this.refs.missionDetails.loadMissionDetails(item.data.questId); }}
                        onRenderTitle={this._onRenderTitle}
                        placeHolder='Select a mission'
                        options={this.state.options}
                    />
                    <MissionDetails questId={this.state.selectedItem} ref='missionDetails' />
                </div>
            );
        else {
            return <div className="centeredVerticalAndHorizontal">
				<div className="ui huge centered text active inline loader">Loading mission and quest data...</div>
			</div>;
        }
    }
}